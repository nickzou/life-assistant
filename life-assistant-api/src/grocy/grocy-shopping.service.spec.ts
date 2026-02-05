import { Test, TestingModule } from '@nestjs/testing';
import { GrocyShoppingService } from './grocy-shopping.service';
import { GrocyService } from './grocy.service';
import { GrocyRecipeService } from './grocy-recipe.service';
import { GrocyMealPlanService } from './grocy-meal-plan.service';

describe('GrocyShoppingService', () => {
  let service: GrocyShoppingService;
  let grocyService: jest.Mocked<Partial<GrocyService>>;
  let grocyRecipeService: jest.Mocked<Partial<GrocyRecipeService>>;
  let grocyMealPlanService: jest.Mocked<Partial<GrocyMealPlanService>>;

  beforeEach(async () => {
    grocyService = {
      getShoppingLists: jest.fn(),
      getShoppingListItems: jest.fn(),
      updateShoppingListItemDone: jest.fn(),
      getEnrichedShoppingListItems: jest.fn(),
      addMissingToShoppingList: jest.fn(),
      addItemsToShoppingList: jest.fn(),
      addMissingProductsToShoppingList: jest.fn(),
      getStock: jest.fn(),
      getAllProducts: jest.fn(),
      getQuantityUnits: jest.fn(),
    };

    grocyRecipeService = {
      getAllRecipes: jest.fn(),
      getRecipeIngredients: jest.fn(),
      getRecipeNestings: jest.fn(),
      buildHomemadeProductMap: jest.fn(),
      resolveRecipeIngredients: jest.fn(),
    };

    grocyMealPlanService = {
      getMealPlanForDateRange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrocyShoppingService,
        { provide: GrocyService, useValue: grocyService },
        { provide: GrocyRecipeService, useValue: grocyRecipeService },
        { provide: GrocyMealPlanService, useValue: grocyMealPlanService },
      ],
    }).compile();

    service = module.get<GrocyShoppingService>(GrocyShoppingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getShoppingLists', () => {
    it('should delegate to GrocyService', async () => {
      const mockLists = [{ id: 1, name: 'Main List' }];
      grocyService.getShoppingLists.mockResolvedValue(mockLists as any);

      const result = await service.getShoppingLists();

      expect(grocyService.getShoppingLists).toHaveBeenCalled();
      expect(result).toEqual(mockLists);
    });
  });

  describe('getShoppingListItems', () => {
    it('should delegate to GrocyService', async () => {
      const mockItems = [{ id: 1, product_id: 10 }];
      grocyService.getShoppingListItems.mockResolvedValue(mockItems as any);

      const result = await service.getShoppingListItems();

      expect(grocyService.getShoppingListItems).toHaveBeenCalled();
      expect(result).toEqual(mockItems);
    });

    it('should pass listId to GrocyService', async () => {
      grocyService.getShoppingListItems.mockResolvedValue([]);

      await service.getShoppingListItems(1);

      expect(grocyService.getShoppingListItems).toHaveBeenCalledWith(1);
    });
  });

  describe('updateShoppingListItemDone', () => {
    it('should delegate to GrocyService', async () => {
      grocyService.updateShoppingListItemDone.mockResolvedValue();

      await service.updateShoppingListItemDone(1, true);

      expect(grocyService.updateShoppingListItemDone).toHaveBeenCalledWith(
        1,
        true,
      );
    });
  });

  describe('addItemsToShoppingList', () => {
    it('should delegate to GrocyService', async () => {
      grocyService.addItemsToShoppingList.mockResolvedValue({
        added: 2,
        failed: 0,
      });

      const items = [
        { product_id: 1, product_name: 'Test', to_buy_amount: 1 },
      ] as any[];
      const result = await service.addItemsToShoppingList(items);

      expect(grocyService.addItemsToShoppingList).toHaveBeenCalledWith(items);
      expect(result).toEqual({ added: 2, failed: 0 });
    });
  });

  describe('generateSmartShoppingList', () => {
    it('should generate shopping list from meal plan', async () => {
      // Setup mocks
      grocyMealPlanService.getMealPlanForDateRange.mockResolvedValue([
        { id: 1, recipe_id: 101, recipe_servings: 2 },
      ] as any[]);

      grocyRecipeService.getAllRecipes.mockResolvedValue([
        { id: 101, name: 'Test Recipe', base_servings: 2 },
      ] as any[]);

      grocyRecipeService.getRecipeIngredients.mockResolvedValue([
        { recipe_id: 101, product_id: 10, amount: 2, qu_id: 1 },
      ] as any[]);

      grocyRecipeService.getRecipeNestings.mockResolvedValue([]);

      grocyService.getStock.mockResolvedValue([{ product_id: 10, amount: 1 }]);

      grocyService.getAllProducts.mockResolvedValue([
        { id: 10, name: 'Flour', qu_id_stock: 1 },
      ] as any[]);

      grocyService.getQuantityUnits.mockResolvedValue([
        { id: 1, name: 'kg' },
      ] as any[]);

      grocyRecipeService.buildHomemadeProductMap.mockReturnValue(new Map());

      grocyRecipeService.resolveRecipeIngredients.mockReturnValue(
        new Map([[10, { amount: 2, qu_id: 1 }]]),
      );

      const result = await service.generateSmartShoppingList(
        '2024-01-15',
        '2024-01-21',
      );

      expect(result.startDate).toBe('2024-01-15');
      expect(result.endDate).toBe('2024-01-21');
      expect(result.recipesProcessed).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].product_name).toBe('Flour');
      expect(result.items[0].needed_amount).toBe(2);
      expect(result.items[0].stock_amount).toBe(1);
      expect(result.items[0].to_buy_amount).toBe(1);
    });

    it('should not include items fully in stock', async () => {
      grocyMealPlanService.getMealPlanForDateRange.mockResolvedValue([
        { id: 1, recipe_id: 101, recipe_servings: 2 },
      ] as any[]);

      grocyRecipeService.getAllRecipes.mockResolvedValue([
        { id: 101, name: 'Test Recipe', base_servings: 2 },
      ] as any[]);

      grocyRecipeService.getRecipeIngredients.mockResolvedValue([]);
      grocyRecipeService.getRecipeNestings.mockResolvedValue([]);
      grocyService.getStock.mockResolvedValue([{ product_id: 10, amount: 10 }]); // Plenty in stock
      grocyService.getAllProducts.mockResolvedValue([
        { id: 10, name: 'Flour' },
      ] as any[]);
      grocyService.getQuantityUnits.mockResolvedValue([]);
      grocyRecipeService.buildHomemadeProductMap.mockReturnValue(new Map());
      grocyRecipeService.resolveRecipeIngredients.mockReturnValue(
        new Map([[10, { amount: 2, qu_id: 1 }]]),
      );

      const result = await service.generateSmartShoppingList(
        '2024-01-15',
        '2024-01-21',
      );

      // Should not include items where stock >= needed
      expect(result.items).toHaveLength(0);
    });
  });
});
