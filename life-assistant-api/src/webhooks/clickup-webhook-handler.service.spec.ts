import { Test, TestingModule } from '@nestjs/testing';
import { ClickUpWebhookHandlerService } from './clickup-webhook-handler.service';
import { ClickUpService } from '@clickup/clickup.service';
import { GrocyService } from '@grocy/grocy.service';

describe('ClickUpWebhookHandlerService', () => {
  let service: ClickUpWebhookHandlerService;
  let clickUpService: jest.Mocked<Partial<ClickUpService>>;
  let grocyService: jest.Mocked<Partial<GrocyService>>;

  beforeEach(async () => {
    clickUpService = {
      getTask: jest.fn(),
    };

    grocyService = {
      createMealPlanItem: jest.fn(),
      consumeRecipe: jest.fn(),
      updateMealPlanItemDone: jest.fn(),
      getMealPlanForDate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickUpWebhookHandlerService,
        { provide: ClickUpService, useValue: clickUpService },
        { provide: GrocyService, useValue: grocyService },
      ],
    }).compile();

    service = module.get<ClickUpWebhookHandlerService>(
      ClickUpWebhookHandlerService,
    );
  });

  describe('handleClickUpWebhook', () => {
    describe('taskCreated event', () => {
      it('should add to meal plan when task with Grocy ID is created', async () => {
        clickUpService.getTask.mockResolvedValue({
          id: 'task-1',
          name: 'Protein Shake',
          custom_fields: [
            {
              id: 'field-123',
              name: 'Grocy ID',
              value: '42',
            },
          ],
        } as any);

        grocyService.createMealPlanItem.mockResolvedValue({
          id: 100,
          day: '2026-02-01',
          recipe_id: 42,
        } as any);

        await service.handleClickUpWebhook({
          event: 'taskCreated',
          task_id: 'task-1',
        });

        expect(clickUpService.getTask).toHaveBeenCalledWith('task-1');
        expect(grocyService.createMealPlanItem).toHaveBeenCalledWith({
          day: expect.any(String),
          recipe_id: 42,
          servings: 1,
        });
        // Should NOT consume on creation
        expect(grocyService.consumeRecipe).not.toHaveBeenCalled();
      });

      it('should skip task creation without Grocy ID field', async () => {
        clickUpService.getTask.mockResolvedValue({
          id: 'task-1',
          name: 'Regular Task',
          custom_fields: [],
        } as any);

        await service.handleClickUpWebhook({
          event: 'taskCreated',
          task_id: 'task-1',
        });

        expect(grocyService.createMealPlanItem).not.toHaveBeenCalled();
      });
    });

    describe('taskUpdated event with Grocy ID custom field', () => {
      it('should add to meal plan when Grocy ID custom field is set', async () => {
        clickUpService.getTask.mockResolvedValue({
          id: 'task-1',
          name: 'Protein Shake',
          custom_fields: [
            {
              id: 'field-123',
              name: 'Grocy ID',
              value: '42',
            },
          ],
        } as any);

        grocyService.createMealPlanItem.mockResolvedValue({
          id: 100,
          day: '2026-02-01',
          recipe_id: 42,
        } as any);

        await service.handleClickUpWebhook({
          event: 'taskUpdated',
          task_id: 'task-1',
          history_items: [
            {
              field: 'custom_field',
              before: null,
              after: '42',
              custom_field: {
                id: 'field-123',
                name: 'Grocy ID',
              },
            },
          ],
        });

        expect(clickUpService.getTask).toHaveBeenCalledWith('task-1');
        expect(grocyService.createMealPlanItem).toHaveBeenCalledWith({
          day: expect.any(String),
          recipe_id: 42,
          servings: 1,
        });
      });

      it('should skip taskUpdated when Grocy ID field was already set (not a new value)', async () => {
        await service.handleClickUpWebhook({
          event: 'taskUpdated',
          task_id: 'task-1',
          history_items: [
            {
              field: 'custom_field',
              before: '10', // Was already set
              after: '42',
              custom_field: {
                id: 'field-123',
                name: 'Grocy ID',
              },
            },
          ],
        });

        expect(clickUpService.getTask).not.toHaveBeenCalled();
        expect(grocyService.createMealPlanItem).not.toHaveBeenCalled();
      });

      it('should skip taskUpdated when custom field is not Grocy ID', async () => {
        await service.handleClickUpWebhook({
          event: 'taskUpdated',
          task_id: 'task-1',
          history_items: [
            {
              field: 'custom_field',
              before: null,
              after: 'some value',
              custom_field: {
                id: 'field-456',
                name: 'Other Field',
              },
            },
          ],
        });

        expect(clickUpService.getTask).not.toHaveBeenCalled();
        expect(grocyService.createMealPlanItem).not.toHaveBeenCalled();
      });

      it('should skip taskUpdated without history_items', async () => {
        await service.handleClickUpWebhook({
          event: 'taskUpdated',
          task_id: 'task-1',
        });

        expect(clickUpService.getTask).not.toHaveBeenCalled();
        expect(grocyService.createMealPlanItem).not.toHaveBeenCalled();
      });
    });

    describe('taskStatusUpdated event', () => {
      it('should skip non-status events', async () => {
        await service.handleClickUpWebhook({
          event: 'taskUpdated',
          task_id: 'task-1',
        });

        expect(clickUpService.getTask).not.toHaveBeenCalled();
        expect(grocyService.consumeRecipe).not.toHaveBeenCalled();
      });

      it('should skip status changes that are not completions', async () => {
        await service.handleClickUpWebhook({
          event: 'taskStatusUpdated',
          task_id: 'task-1',
          history_items: [
            {
              field: 'status',
              after: { type: 'open' },
            },
          ],
        });

        expect(clickUpService.getTask).not.toHaveBeenCalled();
        expect(grocyService.consumeRecipe).not.toHaveBeenCalled();
      });

      it('should consume recipe when task with Grocy ID is completed', async () => {
        clickUpService.getTask.mockResolvedValue({
          id: 'task-1',
          name: 'Protein Shake',
          custom_fields: [
            {
              id: 'field-123',
              name: 'Grocy ID',
              value: '42',
            },
          ],
        } as any);

        grocyService.getMealPlanForDate.mockResolvedValue([
          { id: 100, recipe_id: 42, done: 0 },
        ]);

        await service.handleClickUpWebhook({
          event: 'taskStatusUpdated',
          task_id: 'task-1',
          history_items: [
            {
              field: 'status',
              after: { type: 'done' },
            },
          ],
        });

        expect(clickUpService.getTask).toHaveBeenCalledWith('task-1');
        expect(grocyService.consumeRecipe).toHaveBeenCalledWith(42);
        expect(grocyService.updateMealPlanItemDone).toHaveBeenCalledWith(
          100,
          true,
        );
        // Should NOT create meal plan on completion (already created on task creation)
        expect(grocyService.createMealPlanItem).not.toHaveBeenCalled();
      });

      it('should handle closed status type as completion', async () => {
        clickUpService.getTask.mockResolvedValue({
          id: 'task-1',
          name: 'Protein Shake',
          custom_fields: [
            {
              id: 'field-123',
              name: 'grocy id', // lowercase test
              value: '42',
            },
          ],
        } as any);

        grocyService.getMealPlanForDate.mockResolvedValue([
          { id: 100, recipe_id: 42, done: 0 },
        ]);

        await service.handleClickUpWebhook({
          event: 'taskStatusUpdated',
          task_id: 'task-1',
          history_items: [
            {
              field: 'status',
              after: { type: 'closed' },
            },
          ],
        });

        expect(grocyService.consumeRecipe).toHaveBeenCalledWith(42);
      });

      it('should skip completed tasks without Grocy ID field', async () => {
        clickUpService.getTask.mockResolvedValue({
          id: 'task-1',
          name: 'Regular Task',
          custom_fields: [],
        } as any);

        await service.handleClickUpWebhook({
          event: 'taskStatusUpdated',
          task_id: 'task-1',
          history_items: [
            {
              field: 'status',
              after: { type: 'done' },
            },
          ],
        });

        expect(grocyService.consumeRecipe).not.toHaveBeenCalled();
      });

      it('should skip tasks with invalid Grocy ID value', async () => {
        clickUpService.getTask.mockResolvedValue({
          id: 'task-1',
          name: 'Bad Task',
          custom_fields: [
            {
              id: 'field-123',
              name: 'Grocy ID',
              value: 'not-a-number',
            },
          ],
        } as any);

        await service.handleClickUpWebhook({
          event: 'taskStatusUpdated',
          task_id: 'task-1',
          history_items: [
            {
              field: 'status',
              after: { type: 'done' },
            },
          ],
        });

        expect(grocyService.consumeRecipe).not.toHaveBeenCalled();
      });

      it('should handle errors gracefully during consume', async () => {
        clickUpService.getTask.mockResolvedValue({
          id: 'task-1',
          name: 'Protein Shake',
          custom_fields: [
            {
              id: 'field-123',
              name: 'Grocy ID',
              value: '42',
            },
          ],
        } as any);

        grocyService.consumeRecipe.mockRejectedValue(new Error('Grocy error'));

        // Should not throw
        await service.handleClickUpWebhook({
          event: 'taskStatusUpdated',
          task_id: 'task-1',
          history_items: [
            {
              field: 'status',
              after: { type: 'done' },
            },
          ],
        });

        expect(grocyService.consumeRecipe).toHaveBeenCalled();
      });
    });
  });
});
