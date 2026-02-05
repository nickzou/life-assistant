import { Test, TestingModule } from '@nestjs/testing';
import { GrocyMealPlanService } from './grocy-meal-plan.service';
import { GrocyService } from './grocy.service';

describe('GrocyMealPlanService', () => {
  let service: GrocyMealPlanService;
  let grocyService: jest.Mocked<Partial<GrocyService>>;

  beforeEach(async () => {
    grocyService = {
      getMealPlan: jest.fn(),
      getMealPlanForDate: jest.fn(),
      getMealPlanForDateRange: jest.fn(),
      getMealPlanSections: jest.fn(),
      createMealPlanItem: jest.fn(),
      deleteMealPlanItem: jest.fn(),
      updateMealPlanItemDone: jest.fn(),
      updateMealPlanItem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrocyMealPlanService,
        { provide: GrocyService, useValue: grocyService },
      ],
    }).compile();

    service = module.get<GrocyMealPlanService>(GrocyMealPlanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMealPlan', () => {
    it('should delegate to GrocyService', async () => {
      const mockMeals = [{ id: 1, recipe_id: 101 }];
      grocyService.getMealPlan.mockResolvedValue(mockMeals);

      const result = await service.getMealPlan();

      expect(grocyService.getMealPlan).toHaveBeenCalled();
      expect(result).toEqual(mockMeals);
    });
  });

  describe('getMealPlanForDate', () => {
    it('should delegate to GrocyService with date', async () => {
      const mockMeals = [{ id: 1, recipe_id: 101, day: '2024-01-15' }];
      grocyService.getMealPlanForDate.mockResolvedValue(mockMeals);

      const result = await service.getMealPlanForDate('2024-01-15');

      expect(grocyService.getMealPlanForDate).toHaveBeenCalledWith(
        '2024-01-15',
      );
      expect(result).toEqual(mockMeals);
    });
  });

  describe('getMealPlanForDateRange', () => {
    it('should delegate to GrocyService with date range', async () => {
      const mockMeals = [{ id: 1, recipe_id: 101 }] as any;
      grocyService.getMealPlanForDateRange.mockResolvedValue(mockMeals);

      const result = await service.getMealPlanForDateRange(
        '2024-01-15',
        '2024-01-21',
      );

      expect(grocyService.getMealPlanForDateRange).toHaveBeenCalledWith(
        '2024-01-15',
        '2024-01-21',
      );
      expect(result).toEqual(mockMeals);
    });
  });

  describe('getMealPlanSections', () => {
    it('should delegate to GrocyService', async () => {
      const mockSections = [{ id: 1, name: 'Dinner', sort_number: 1 }] as any;
      grocyService.getMealPlanSections.mockResolvedValue(mockSections);

      const result = await service.getMealPlanSections();

      expect(grocyService.getMealPlanSections).toHaveBeenCalled();
      expect(result).toEqual(mockSections);
    });
  });

  describe('createMealPlanItem', () => {
    it('should delegate to GrocyService', async () => {
      const mockItem = { id: 1, recipe_id: 101, day: '2024-01-15' };
      grocyService.createMealPlanItem.mockResolvedValue(mockItem as any);

      const dto = { day: '2024-01-15', recipe_id: 101 };
      const result = await service.createMealPlanItem(dto);

      expect(grocyService.createMealPlanItem).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockItem);
    });
  });

  describe('deleteMealPlanItem', () => {
    it('should delegate to GrocyService', async () => {
      grocyService.deleteMealPlanItem.mockResolvedValue();

      await service.deleteMealPlanItem(1);

      expect(grocyService.deleteMealPlanItem).toHaveBeenCalledWith(1);
    });
  });

  describe('updateMealPlanItemDone', () => {
    it('should delegate to GrocyService', async () => {
      grocyService.updateMealPlanItemDone.mockResolvedValue();

      await service.updateMealPlanItemDone(1, true);

      expect(grocyService.updateMealPlanItemDone).toHaveBeenCalledWith(1, true);
    });
  });

  describe('updateMealPlanItem', () => {
    it('should delegate to GrocyService', async () => {
      grocyService.updateMealPlanItem.mockResolvedValue();

      await service.updateMealPlanItem(1, { section_id: 2 });

      expect(grocyService.updateMealPlanItem).toHaveBeenCalledWith(1, {
        section_id: 2,
      });
    });
  });
});
