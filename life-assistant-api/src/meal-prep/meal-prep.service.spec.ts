import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { MealPrepService } from './meal-prep.service';
import { RecipePrepConfig } from '@database/entities/recipe-prep-config.entity';
import { MealPlanTaskMapping } from '@database/entities/meal-plan-task-mapping.entity';
import { ClickUpService } from '@clickup/clickup.service';
import { GrocyService } from '@grocy/grocy.service';

describe('MealPrepService', () => {
  let service: MealPrepService;
  let mockPrepConfigRepo: any;
  let mockTaskMappingRepo: any;
  let mockClickUpService: any;
  let mockGrocyService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockPrepConfigRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockTaskMappingRepo = {
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockClickUpService = {
      getListCustomFields: jest.fn(),
      createTask: jest.fn(),
      deleteTask: jest.fn(),
      getTask: jest.fn(),
    };

    mockGrocyService = {
      createMealPlanItem: jest.fn(),
      deleteMealPlanItem: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('test-list-id'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealPrepService,
        {
          provide: getRepositoryToken(RecipePrepConfig),
          useValue: mockPrepConfigRepo,
        },
        {
          provide: getRepositoryToken(MealPlanTaskMapping),
          useValue: mockTaskMappingRepo,
        },
        {
          provide: ClickUpService,
          useValue: mockClickUpService,
        },
        {
          provide: GrocyService,
          useValue: mockGrocyService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MealPrepService>(MealPrepService);
  });

  describe('getPrepConfig', () => {
    it('should return prep config for a recipe', async () => {
      const mockConfig = {
        id: 1,
        grocy_recipe_id: 5,
        requires_defrost: true,
        defrost_item: 'chicken thighs',
      };
      mockPrepConfigRepo.findOne.mockResolvedValue(mockConfig);

      const result = await service.getPrepConfig(5);

      expect(mockPrepConfigRepo.findOne).toHaveBeenCalledWith({
        where: { grocy_recipe_id: 5 },
      });
      expect(result).toEqual(mockConfig);
    });

    it('should return null when no config exists', async () => {
      mockPrepConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.getPrepConfig(999);

      expect(result).toBeNull();
    });
  });

  describe('getAllPrepConfigs', () => {
    it('should return all prep configs', async () => {
      const mockConfigs = [
        { id: 1, grocy_recipe_id: 5, requires_defrost: true },
        { id: 2, grocy_recipe_id: 10, requires_defrost: false },
      ];
      mockPrepConfigRepo.find.mockResolvedValue(mockConfigs);

      const result = await service.getAllPrepConfigs();

      expect(mockPrepConfigRepo.find).toHaveBeenCalled();
      expect(result).toEqual(mockConfigs);
    });
  });

  describe('savePrepConfig', () => {
    it('should update existing config', async () => {
      const existingConfig = {
        id: 1,
        grocy_recipe_id: 5,
        requires_defrost: false,
      };
      const updatedConfig = { ...existingConfig, requires_defrost: true };

      mockPrepConfigRepo.findOne.mockResolvedValue(existingConfig);
      mockPrepConfigRepo.update.mockResolvedValue({});
      mockPrepConfigRepo.findOneOrFail.mockResolvedValue(updatedConfig);

      const result = await service.savePrepConfig(5, {
        requires_defrost: true,
      });

      expect(mockPrepConfigRepo.update).toHaveBeenCalledWith(1, {
        requires_defrost: true,
      });
      expect(result).toEqual(updatedConfig);
    });

    it('should create new config when none exists', async () => {
      const newConfig = {
        grocy_recipe_id: 10,
        requires_defrost: true,
        defrost_item: 'pork',
      };

      mockPrepConfigRepo.findOne.mockResolvedValue(null);
      mockPrepConfigRepo.create.mockReturnValue(newConfig);
      mockPrepConfigRepo.save.mockResolvedValue({ id: 2, ...newConfig });

      const result = await service.savePrepConfig(10, {
        requires_defrost: true,
        defrost_item: 'pork',
      });

      expect(mockPrepConfigRepo.create).toHaveBeenCalledWith({
        grocy_recipe_id: 10,
        requires_defrost: true,
        defrost_item: 'pork',
      });
      expect(mockPrepConfigRepo.save).toHaveBeenCalled();
      expect(result.id).toBe(2);
    });
  });

  describe('createMealWithTasks', () => {
    const mockMealData = {
      day: '2026-01-28',
      recipe_id: 5,
      section_id: 1,
      servings: 2,
      sectionName: 'Dinner',
    };

    const mockCreatedMeal = {
      id: 42,
      day: '2026-01-28',
      recipe_id: 5,
      section_id: 1,
      recipe_servings: 2,
    };

    beforeEach(() => {
      mockGrocyService.createMealPlanItem.mockResolvedValue(mockCreatedMeal);
      mockClickUpService.getListCustomFields.mockResolvedValue([
        {
          id: 'field-123',
          name: 'Time of Day',
          type_config: {
            options: [
              { id: 'opt-early', name: 'Early Morning' },
              { id: 'opt-morning', name: 'Morning' },
              { id: 'opt-midday', name: 'Mid Day' },
              { id: 'opt-evening', name: 'Evening' },
            ],
          },
        },
      ]);
    });

    it('should create meal without ClickUp tasks when createClickUpTasks is false', async () => {
      const result = await service.createMealWithTasks(
        mockMealData,
        false,
        'Spaghetti',
      );

      expect(mockGrocyService.createMealPlanItem).toHaveBeenCalledWith(
        mockMealData,
      );
      expect(mockClickUpService.createTask).not.toHaveBeenCalled();
      expect(result.mealPlanItem).toEqual(mockCreatedMeal);
      expect(result.clickUpTasks).toHaveLength(0);
    });

    it('should create meal with main ClickUp task', async () => {
      mockClickUpService.createTask.mockResolvedValue({ id: 'task-abc' });
      mockPrepConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.createMealWithTasks(
        mockMealData,
        true,
        'Spaghetti',
      );

      expect(mockGrocyService.createMealPlanItem).toHaveBeenCalledWith(
        mockMealData,
      );
      expect(mockClickUpService.createTask).toHaveBeenCalledWith(
        'test-list-id',
        expect.objectContaining({
          name: 'Spaghetti',
          tags: ['meal prep', 'meal', 'dinner'],
          due_date: expect.any(Number),
        }),
      );
      expect(mockTaskMappingRepo.save).toHaveBeenCalledWith({
        meal_plan_item_id: 42,
        clickup_task_id: 'task-abc',
        task_type: 'main',
      });
      expect(result.clickUpTasks).toEqual(['task-abc']);
    });

    it('should set Time of Day custom field based on section', async () => {
      mockClickUpService.createTask.mockResolvedValue({ id: 'task-abc' });
      mockPrepConfigRepo.findOne.mockResolvedValue(null);

      await service.createMealWithTasks(mockMealData, true, 'Spaghetti');

      expect(mockClickUpService.createTask).toHaveBeenCalledWith(
        'test-list-id',
        expect.objectContaining({
          custom_fields: [{ id: 'field-123', value: 'opt-evening' }],
        }),
      );
    });

    it('should create defrost task when recipe has defrost config', async () => {
      mockClickUpService.createTask
        .mockResolvedValueOnce({ id: 'task-main' })
        .mockResolvedValueOnce({ id: 'task-defrost' });
      mockPrepConfigRepo.findOne.mockResolvedValue({
        requires_defrost: true,
        defrost_item: 'chicken thighs',
      });

      const result = await service.createMealWithTasks(
        mockMealData,
        true,
        'Char Siu Chicken',
      );

      expect(mockClickUpService.createTask).toHaveBeenCalledTimes(2);

      // Verify defrost task
      expect(mockClickUpService.createTask).toHaveBeenNthCalledWith(
        2,
        'test-list-id',
        expect.objectContaining({
          name: 'Defrost chicken thighs',
          tags: ['meal prep'],
          custom_fields: [{ id: 'field-123', value: 'opt-early' }],
        }),
      );

      expect(result.clickUpTasks).toEqual(['task-main', 'task-defrost']);
    });

    it('should use default defrost item when not specified', async () => {
      mockClickUpService.createTask
        .mockResolvedValueOnce({ id: 'task-main' })
        .mockResolvedValueOnce({ id: 'task-defrost' });
      mockPrepConfigRepo.findOne.mockResolvedValue({
        requires_defrost: true,
        defrost_item: null,
      });

      await service.createMealWithTasks(mockMealData, true, 'Recipe');

      expect(mockClickUpService.createTask).toHaveBeenNthCalledWith(
        2,
        'test-list-id',
        expect.objectContaining({
          name: 'Defrost protein',
        }),
      );
    });

    it('should continue even if ClickUp task creation fails', async () => {
      mockClickUpService.createTask.mockRejectedValue(
        new Error('ClickUp API error'),
      );
      mockPrepConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.createMealWithTasks(
        mockMealData,
        true,
        'Recipe',
      );

      expect(result.mealPlanItem).toEqual(mockCreatedMeal);
      expect(result.clickUpTasks).toHaveLength(0);
    });
  });

  describe('deleteMealWithTasks', () => {
    it('should delete meal and associated ClickUp tasks', async () => {
      const mappings = [
        {
          meal_plan_item_id: 42,
          clickup_task_id: 'task-main',
          task_type: 'main',
        },
        {
          meal_plan_item_id: 42,
          clickup_task_id: 'task-defrost',
          task_type: 'defrost',
        },
      ];
      mockTaskMappingRepo.find.mockResolvedValue(mappings);
      mockClickUpService.getTask.mockResolvedValue({
        status: { type: 'open' },
      });
      mockClickUpService.deleteTask.mockResolvedValue({});
      mockGrocyService.deleteMealPlanItem.mockResolvedValue({});

      const result = await service.deleteMealWithTasks(42);

      expect(mockClickUpService.deleteTask).toHaveBeenCalledTimes(2);
      expect(mockGrocyService.deleteMealPlanItem).toHaveBeenCalledWith(42);
      expect(mockTaskMappingRepo.delete).toHaveBeenCalledWith({
        meal_plan_item_id: 42,
      });
      expect(result).toEqual({
        grocyDeleted: true,
        clickUpTasksDeleted: 2,
        clickUpTasksSkipped: 0,
      });
    });

    it('should skip deletion of completed ClickUp tasks', async () => {
      const mappings = [
        {
          meal_plan_item_id: 42,
          clickup_task_id: 'task-main',
          task_type: 'main',
        },
      ];
      mockTaskMappingRepo.find.mockResolvedValue(mappings);
      mockClickUpService.getTask.mockResolvedValue({
        status: { type: 'done' },
      });
      mockGrocyService.deleteMealPlanItem.mockResolvedValue({});

      const result = await service.deleteMealWithTasks(42);

      expect(mockClickUpService.deleteTask).not.toHaveBeenCalled();
      expect(result).toEqual({
        grocyDeleted: true,
        clickUpTasksDeleted: 0,
        clickUpTasksSkipped: 1,
      });
    });

    it('should handle mixed completed and incomplete tasks', async () => {
      const mappings = [
        {
          meal_plan_item_id: 42,
          clickup_task_id: 'task-main',
          task_type: 'main',
        },
        {
          meal_plan_item_id: 42,
          clickup_task_id: 'task-defrost',
          task_type: 'defrost',
        },
      ];
      mockTaskMappingRepo.find.mockResolvedValue(mappings);
      mockClickUpService.getTask
        .mockResolvedValueOnce({ status: { type: 'done' } }) // main is done
        .mockResolvedValueOnce({ status: { type: 'open' } }); // defrost is open
      mockClickUpService.deleteTask.mockResolvedValue({});
      mockGrocyService.deleteMealPlanItem.mockResolvedValue({});

      const result = await service.deleteMealWithTasks(42);

      expect(mockClickUpService.deleteTask).toHaveBeenCalledTimes(1);
      expect(mockClickUpService.deleteTask).toHaveBeenCalledWith(
        'task-defrost',
      );
      expect(result).toEqual({
        grocyDeleted: true,
        clickUpTasksDeleted: 1,
        clickUpTasksSkipped: 1,
      });
    });

    it('should delete meal even if no ClickUp task mappings exist', async () => {
      mockTaskMappingRepo.find.mockResolvedValue([]);
      mockGrocyService.deleteMealPlanItem.mockResolvedValue({});

      const result = await service.deleteMealWithTasks(42);

      expect(mockClickUpService.deleteTask).not.toHaveBeenCalled();
      expect(mockGrocyService.deleteMealPlanItem).toHaveBeenCalledWith(42);
      expect(mockTaskMappingRepo.delete).not.toHaveBeenCalled();
      expect(result).toEqual({
        grocyDeleted: true,
        clickUpTasksDeleted: 0,
        clickUpTasksSkipped: 0,
      });
    });

    it('should continue if ClickUp task deletion fails', async () => {
      const mappings = [
        {
          meal_plan_item_id: 42,
          clickup_task_id: 'task-main',
          task_type: 'main',
        },
      ];
      mockTaskMappingRepo.find.mockResolvedValue(mappings);
      mockClickUpService.getTask.mockResolvedValue({
        status: { type: 'open' },
      });
      mockClickUpService.deleteTask.mockRejectedValue(
        new Error('Task not found'),
      );
      mockGrocyService.deleteMealPlanItem.mockResolvedValue({});

      const result = await service.deleteMealWithTasks(42);

      expect(mockGrocyService.deleteMealPlanItem).toHaveBeenCalledWith(42);
      expect(result.grocyDeleted).toBe(true);
    });

    it('should handle Grocy deletion failure', async () => {
      mockTaskMappingRepo.find.mockResolvedValue([]);
      mockGrocyService.deleteMealPlanItem.mockRejectedValue(
        new Error('Grocy error'),
      );

      const result = await service.deleteMealWithTasks(42);

      expect(result.grocyDeleted).toBe(false);
    });
  });

  describe('without CLICKUP_MEALS_LIST_ID configured', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MealPrepService,
          {
            provide: getRepositoryToken(RecipePrepConfig),
            useValue: mockPrepConfigRepo,
          },
          {
            provide: getRepositoryToken(MealPlanTaskMapping),
            useValue: mockTaskMappingRepo,
          },
          {
            provide: ClickUpService,
            useValue: mockClickUpService,
          },
          {
            provide: GrocyService,
            useValue: mockGrocyService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<MealPrepService>(MealPrepService);
    });

    it('should create meal without ClickUp tasks when list ID not configured', async () => {
      const mockMealData = {
        day: '2026-01-28',
        recipe_id: 5,
        section_id: 1,
        servings: 2,
      };
      const mockCreatedMeal = { id: 42, ...mockMealData };
      mockGrocyService.createMealPlanItem.mockResolvedValue(mockCreatedMeal);

      const result = await service.createMealWithTasks(
        mockMealData,
        true,
        'Recipe',
      );

      expect(mockClickUpService.createTask).not.toHaveBeenCalled();
      expect(result.clickUpTasks).toHaveLength(0);
    });
  });
});
