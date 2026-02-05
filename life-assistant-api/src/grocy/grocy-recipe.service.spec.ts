import { Test, TestingModule } from '@nestjs/testing';
import { GrocyRecipeService } from './grocy-recipe.service';
import { GrocyService } from './grocy.service';

describe('GrocyRecipeService', () => {
  let service: GrocyRecipeService;
  let grocyService: jest.Mocked<Partial<GrocyService>>;

  beforeEach(async () => {
    grocyService = {
      getRecipes: jest.fn(),
      getAllRecipes: jest.fn(),
      getRecipe: jest.fn(),
      getRecipeNestings: jest.fn(),
      getRecipeIngredients: jest.fn(),
      getRecipePicture: jest.fn(),
      getRecipeFulfillment: jest.fn(),
      consumeRecipe: jest.fn(),
      getRecipesForSelection: jest.fn(),
      getHomemadeProducts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrocyRecipeService,
        { provide: GrocyService, useValue: grocyService },
      ],
    }).compile();

    service = module.get<GrocyRecipeService>(GrocyRecipeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRecipes', () => {
    it('should delegate to GrocyService', async () => {
      const mockRecipes = [{ id: 1, name: 'Test Recipe' }];
      grocyService.getRecipes.mockResolvedValue(mockRecipes);

      const result = await service.getRecipes();

      expect(grocyService.getRecipes).toHaveBeenCalled();
      expect(result).toEqual(mockRecipes);
    });
  });

  describe('getRecipe', () => {
    it('should delegate to GrocyService with recipeId', async () => {
      const mockRecipe = { id: 1, name: 'Test Recipe' };
      grocyService.getRecipe.mockResolvedValue(mockRecipe);

      const result = await service.getRecipe(1);

      expect(grocyService.getRecipe).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockRecipe);
    });
  });

  describe('consumeRecipe', () => {
    it('should delegate to GrocyService with recipeId and servings', async () => {
      grocyService.consumeRecipe.mockResolvedValue();

      await service.consumeRecipe(1, 2);

      expect(grocyService.consumeRecipe).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('buildHomemadeProductMap', () => {
    it('should build a map of product_id to recipe', () => {
      const recipes = [
        { id: 1, name: 'Bread', product_id: 10 },
        { id: 2, name: 'Pasta', product_id: 20 },
        { id: 3, name: 'Salad' }, // No product_id
      ] as any[];

      const result = service.buildHomemadeProductMap(recipes);

      expect(result.size).toBe(2);
      expect(result.get(10)).toEqual(recipes[0]);
      expect(result.get(20)).toEqual(recipes[1]);
      expect(result.has(30)).toBe(false);
    });

    it('should return empty map for recipes without product_id', () => {
      const recipes = [{ id: 1, name: 'Test' }] as any[];

      const result = service.buildHomemadeProductMap(recipes);

      expect(result.size).toBe(0);
    });
  });

  describe('resolveRecipeIngredients', () => {
    it('should resolve simple purchasable ingredients', () => {
      const ingredientsByRecipe = new Map([
        [
          1,
          [
            { recipe_id: 1, product_id: 10, amount: 2, qu_id: 1 },
            { recipe_id: 1, product_id: 20, amount: 3, qu_id: 2 },
          ],
        ],
      ]);
      const nestingsByRecipe = new Map();
      const recipeMap = new Map([[1, { id: 1, base_servings: 1 }]]);
      const homemadeProductMap = new Map();
      const stockMap = new Map();
      const homemadeStockUsed = new Map();
      const visited = new Set<number>();

      const result = service.resolveRecipeIngredients(
        1,
        1,
        ingredientsByRecipe as any,
        nestingsByRecipe,
        recipeMap as any,
        homemadeProductMap,
        stockMap,
        homemadeStockUsed,
        visited,
      );

      expect(result.size).toBe(2);
      expect(result.get(10)).toEqual({ amount: 2, qu_id: 1 });
      expect(result.get(20)).toEqual({ amount: 3, qu_id: 2 });
    });

    it('should apply servings multiplier', () => {
      const ingredientsByRecipe = new Map([
        [1, [{ recipe_id: 1, product_id: 10, amount: 2, qu_id: 1 }]],
      ]);
      const nestingsByRecipe = new Map();
      const recipeMap = new Map([[1, { id: 1, base_servings: 1 }]]);
      const homemadeProductMap = new Map();
      const stockMap = new Map();
      const homemadeStockUsed = new Map();
      const visited = new Set<number>();

      const result = service.resolveRecipeIngredients(
        1,
        3, // 3x servings
        ingredientsByRecipe as any,
        nestingsByRecipe,
        recipeMap as any,
        homemadeProductMap,
        stockMap,
        homemadeStockUsed,
        visited,
      );

      expect(result.get(10)).toEqual({ amount: 6, qu_id: 1 });
    });

    it('should detect circular dependencies', () => {
      const ingredientsByRecipe = new Map([
        [1, [{ recipe_id: 1, product_id: 10, amount: 2, qu_id: 1 }]],
      ]);
      const nestingsByRecipe = new Map();
      const recipeMap = new Map([[1, { id: 1, base_servings: 1 }]]);
      const homemadeProductMap = new Map();
      const stockMap = new Map();
      const homemadeStockUsed = new Map();
      const visited = new Set<number>([1]); // Already visited

      const result = service.resolveRecipeIngredients(
        1,
        1,
        ingredientsByRecipe as any,
        nestingsByRecipe,
        recipeMap as any,
        homemadeProductMap,
        stockMap,
        homemadeStockUsed,
        visited,
      );

      expect(result.size).toBe(0);
    });

    it('should use homemade products from stock when available', () => {
      const ingredientsByRecipe = new Map([
        [1, [{ recipe_id: 1, product_id: 10, amount: 2, qu_id: 1 }]], // 10 is homemade
        [2, [{ recipe_id: 2, product_id: 20, amount: 1, qu_id: 1 }]], // Base ingredient for 10
      ]);
      const nestingsByRecipe = new Map();
      const recipeMap = new Map([
        [1, { id: 1, base_servings: 1 }],
        [2, { id: 2, base_servings: 1, product_id: 10 }],
      ]);
      const homemadeProductMap = new Map([[10, { id: 2, base_servings: 1 }]]);
      const stockMap = new Map([[10, 5]]); // 5 in stock
      const homemadeStockUsed = new Map();
      const visited = new Set<number>();

      const result = service.resolveRecipeIngredients(
        1,
        1,
        ingredientsByRecipe as any,
        nestingsByRecipe,
        recipeMap as any,
        homemadeProductMap as any,
        stockMap,
        homemadeStockUsed,
        visited,
      );

      // Should use from stock, not resolve to base ingredients
      expect(result.size).toBe(0);
      expect(homemadeStockUsed.get(10)).toBe(2);
    });
  });
});
