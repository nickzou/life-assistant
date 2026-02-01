import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GrocyService } from './grocy.service';
import { Recipe, RecipeIngredient, RecipeNesting } from './grocy.types';

describe('GrocyService', () => {
  let service: GrocyService;
  let mockAxiosInstance: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrocyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'GROCY_URL') return 'http://localhost:9283';
              if (key === 'GROCY_API_KEY') return 'test-api-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GrocyService>(GrocyService);

    // Mock the axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };
    (service as any).axiosInstance = mockAxiosInstance;
  });

  describe('getRecipePicture', () => {
    it('should encode filename to Base64', async () => {
      const filename = 'recipe-image.jpg';
      const expectedBase64 = Buffer.from(filename).toString('base64');

      mockAxiosInstance.get.mockResolvedValue({
        data: Buffer.from('image-data'),
        headers: { 'content-type': 'image/jpeg' },
      });

      await service.getRecipePicture(filename);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/files/recipepictures/${expectedBase64}`,
        { responseType: 'arraybuffer' },
      );
    });

    it('should handle special characters in filename', async () => {
      const filename = 'spätzle & sauce.png';
      const expectedBase64 = Buffer.from(filename).toString('base64');

      mockAxiosInstance.get.mockResolvedValue({
        data: Buffer.from('image-data'),
        headers: { 'content-type': 'image/png' },
      });

      await service.getRecipePicture(filename);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/files/recipepictures/${expectedBase64}`,
        { responseType: 'arraybuffer' },
      );
    });

    it('should return buffer and content type', async () => {
      const imageData = Buffer.from('fake-image-data');
      mockAxiosInstance.get.mockResolvedValue({
        data: imageData,
        headers: { 'content-type': 'image/png' },
      });

      const result = await service.getRecipePicture('test.png');

      expect(result).toEqual({
        data: imageData,
        contentType: 'image/png',
      });
    });

    it('should default to image/jpeg when content-type missing', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: Buffer.from('image-data'),
        headers: {},
      });

      const result = await service.getRecipePicture('test.jpg');

      expect(result.contentType).toBe('image/jpeg');
    });
  });

  describe('getMealPlanForDateRange', () => {
    it('should fetch meals with date range query params', async () => {
      const mockMeals = [
        { id: 1, day: '2025-01-20', recipe_id: 10 },
        { id: 2, day: '2025-01-21', recipe_id: 11 },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: mockMeals });

      const result = await service.getMealPlanForDateRange(
        '2025-01-20',
        '2025-01-26',
      );

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/objects/meal_plan?query[]=day>=2025-01-20&query[]=day<=2025-01-26',
      );
      expect(result).toEqual(mockMeals);
    });
  });

  describe('getRecipeFulfillment', () => {
    it('should fetch recipe fulfillment status', async () => {
      const mockFulfillment = {
        recipe_id: 5,
        need_fulfilled: false,
        missing_products_count: 2,
        products: [],
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockFulfillment });

      const result = await service.getRecipeFulfillment(5);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/recipes/5/fulfillment',
      );
      expect(result).toEqual(mockFulfillment);
    });
  });

  describe('addMissingToShoppingList', () => {
    it('should POST to add missing ingredients', async () => {
      mockAxiosInstance.post.mockResolvedValue({});

      await service.addMissingToShoppingList(10);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/recipes/10/add-not-fulfilled-products-to-shoppinglist',
      );
    });
  });

  describe('getShoppingLists', () => {
    it('should fetch all shopping lists', async () => {
      const mockLists = [
        { id: 1, name: 'Default' },
        { id: 2, name: 'Weekly' },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: mockLists });

      const result = await service.getShoppingLists();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/objects/shopping_lists',
      );
      expect(result).toEqual(mockLists);
    });
  });

  describe('getShoppingListItems', () => {
    it('should fetch all items when no listId provided', async () => {
      const mockItems = [{ id: 1, product_id: 5, amount: 2 }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockItems });

      const result = await service.getShoppingListItems();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/objects/shopping_list',
      );
      expect(result).toEqual(mockItems);
    });

    it('should filter by listId when provided', async () => {
      const mockItems = [{ id: 1, product_id: 5, amount: 2 }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockItems });

      const result = await service.getShoppingListItems(3);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/objects/shopping_list?query[]=shopping_list_id=3',
      );
      expect(result).toEqual(mockItems);
    });
  });

  describe('getMealPlanSections', () => {
    it('should fetch all meal plan sections', async () => {
      const mockSections = [
        { id: 1, name: 'Breakfast', sort_number: 1 },
        { id: 2, name: 'Lunch', sort_number: 2 },
        { id: 3, name: 'Dinner', sort_number: 3 },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: mockSections });

      const result = await service.getMealPlanSections();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/objects/meal_plan_sections',
      );
      expect(result).toEqual(mockSections);
    });

    it('should handle sections with null names', async () => {
      const mockSections = [
        { id: -1, name: null, sort_number: -1 },
        { id: 1, name: 'Breakfast', sort_number: 1 },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: mockSections });

      const result = await service.getMealPlanSections();

      expect(result).toEqual(mockSections);
      expect(result[0].name).toBeNull();
    });
  });

  describe('updateShoppingListItemDone', () => {
    beforeEach(() => {
      mockAxiosInstance.put = jest.fn();
    });

    it('should update item to done status', async () => {
      mockAxiosInstance.put.mockResolvedValue({});

      await service.updateShoppingListItemDone(42, true);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/objects/shopping_list/42',
        { done: 1 },
      );
    });

    it('should update item to not done status', async () => {
      mockAxiosInstance.put.mockResolvedValue({});

      await service.updateShoppingListItemDone(42, false);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/objects/shopping_list/42',
        { done: 0 },
      );
    });
  });

  describe('addMissingProductsToShoppingList', () => {
    it('should add missing products to default list', async () => {
      mockAxiosInstance.post.mockResolvedValue({});

      await service.addMissingProductsToShoppingList();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/stock/shoppinglist/add-missing-products',
        {},
      );
    });

    it('should add missing products to specified list', async () => {
      mockAxiosInstance.post.mockResolvedValue({});

      await service.addMissingProductsToShoppingList(3);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/stock/shoppinglist/add-missing-products',
        { list_id: 3 },
      );
    });
  });

  describe('getEnrichedShoppingListItems', () => {
    it('should enrich items with product names and quantity units', async () => {
      const mockItems = [
        { id: 1, product_id: 5, amount: 2, done: false, shopping_list_id: 1 },
        {
          id: 2,
          product_id: null,
          note: 'Custom item',
          amount: 1,
          done: false,
          shopping_list_id: 1,
        },
      ];
      const mockProducts = [
        { id: 5, name: 'Milk', qu_id_stock: 10 },
        { id: 6, name: 'Eggs', qu_id_stock: 11 },
      ];
      const mockQuantityUnits = [
        { id: 10, name: 'Liter' },
        { id: 11, name: 'Piece' },
      ];

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockItems })
        .mockResolvedValueOnce({ data: mockProducts })
        .mockResolvedValueOnce({ data: mockQuantityUnits });

      const result = await service.getEnrichedShoppingListItems();

      expect(result).toEqual([
        {
          id: 1,
          product_id: 5,
          amount: 2,
          done: false,
          shopping_list_id: 1,
          product_name: 'Milk',
          qu_name: 'Liter',
        },
        {
          id: 2,
          product_id: null,
          note: 'Custom item',
          amount: 1,
          done: false,
          shopping_list_id: 1,
          product_name: undefined,
          qu_name: undefined,
        },
      ]);
    });
  });

  describe('buildHomemadeProductMap', () => {
    it('should return empty map for empty recipes array', () => {
      const result = service.buildHomemadeProductMap([]);
      expect(result.size).toBe(0);
    });

    it('should return empty map when no recipes have product_id', () => {
      const recipes: Recipe[] = [
        { id: 1, name: 'Simple Recipe', base_servings: 1, desired_servings: 1 },
        { id: 2, name: 'Another Recipe', base_servings: 2, desired_servings: 2 },
      ];
      const result = service.buildHomemadeProductMap(recipes);
      expect(result.size).toBe(0);
    });

    it('should map product_id to recipe for homemade products', () => {
      const recipes: Recipe[] = [
        { id: 5, name: 'Char Siu Chicken', base_servings: 2, desired_servings: 2, product_id: 157 },
        { id: 6, name: 'Thai Yellow Curry', base_servings: 4, desired_servings: 4, product_id: 149 },
      ];
      const result = service.buildHomemadeProductMap(recipes);

      expect(result.size).toBe(2);
      expect(result.get(157)).toEqual(recipes[0]);
      expect(result.get(149)).toEqual(recipes[1]);
    });

    it('should only include recipes with product_id set', () => {
      const recipes: Recipe[] = [
        { id: 1, name: 'Regular Recipe', base_servings: 1, desired_servings: 1 },
        { id: 5, name: 'Char Siu Chicken', base_servings: 2, desired_servings: 2, product_id: 157 },
        { id: 7, name: 'Another Regular', base_servings: 1, desired_servings: 1 },
      ];
      const result = service.buildHomemadeProductMap(recipes);

      expect(result.size).toBe(1);
      expect(result.get(157)).toEqual(recipes[1]);
      expect(result.has(1)).toBe(false);
    });

    it('should handle recipe with product_id of 0', () => {
      // Edge case: product_id of 0 is falsy but valid
      const recipes: Recipe[] = [
        { id: 1, name: 'Recipe Zero', base_servings: 1, desired_servings: 1, product_id: 0 },
      ];
      const result = service.buildHomemadeProductMap(recipes);

      // product_id: 0 is falsy, so it won't be added (this is expected behavior)
      expect(result.size).toBe(0);
    });
  });

  describe('resolveRecipeIngredients', () => {
    // Helper to create test data
    const createIngredientsByRecipe = (
      ingredients: RecipeIngredient[],
    ): Map<number, RecipeIngredient[]> => {
      const map = new Map<number, RecipeIngredient[]>();
      for (const ing of ingredients) {
        const list = map.get(ing.recipe_id) || [];
        list.push(ing);
        map.set(ing.recipe_id, list);
      }
      return map;
    };

    const createNestingsByRecipe = (
      nestings: RecipeNesting[],
    ): Map<number, RecipeNesting[]> => {
      const map = new Map<number, RecipeNesting[]>();
      for (const nesting of nestings) {
        const list = map.get(nesting.recipe_id) || [];
        list.push(nesting);
        map.set(nesting.recipe_id, list);
      }
      return map;
    };

    const createRecipeMap = (recipes: Recipe[]): Map<number, Recipe> => {
      return new Map(recipes.map((r) => [r.id, r]));
    };

    describe('simple recipes (no homemade, no nestings)', () => {
      it('should return empty map for recipe with no ingredients', () => {
        const ingredientsByRecipe = new Map<number, RecipeIngredient[]>();
        const nestingsByRecipe = new Map<number, RecipeNesting[]>();
        const recipeMap = new Map<number, Recipe>();
        const homemadeProductMap = new Map<number, Recipe>();
        const stockMap = new Map<number, number>();
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          1, // recipeId
          1, // servingsMultiplier
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        expect(result.size).toBe(0);
        expect(visited.has(1)).toBe(true);
      });

      it('should return ingredients for simple recipe', () => {
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 1, product_id: 10, amount: 2, qu_id: 1 },
          { id: 2, recipe_id: 1, product_id: 20, amount: 100, qu_id: 2 },
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);
        const nestingsByRecipe = new Map<number, RecipeNesting[]>();
        const recipeMap = new Map<number, Recipe>();
        const homemadeProductMap = new Map<number, Recipe>();
        const stockMap = new Map<number, number>();
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          1,
          1,
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        expect(result.size).toBe(2);
        expect(result.get(10)).toEqual({ amount: 2, qu_id: 1 });
        expect(result.get(20)).toEqual({ amount: 100, qu_id: 2 });
      });

      it('should apply servings multiplier correctly', () => {
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 1, product_id: 10, amount: 2, qu_id: 1 },
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);
        const nestingsByRecipe = new Map<number, RecipeNesting[]>();
        const recipeMap = new Map<number, Recipe>();
        const homemadeProductMap = new Map<number, Recipe>();
        const stockMap = new Map<number, number>();
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          1,
          3, // 3x servings
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        expect(result.get(10)).toEqual({ amount: 6, qu_id: 1 }); // 2 * 3 = 6
      });

      it('should aggregate same product appearing multiple times', () => {
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 1, product_id: 10, amount: 2, qu_id: 1 },
          { id: 2, recipe_id: 1, product_id: 10, amount: 3, qu_id: 1 }, // same product
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);
        const nestingsByRecipe = new Map<number, RecipeNesting[]>();
        const recipeMap = new Map<number, Recipe>();
        const homemadeProductMap = new Map<number, Recipe>();
        const stockMap = new Map<number, number>();
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          1,
          1,
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        expect(result.size).toBe(1);
        expect(result.get(10)).toEqual({ amount: 5, qu_id: 1 }); // 2 + 3 = 5
      });
    });

    describe('homemade products', () => {
      it('should use homemade product from stock when available', () => {
        // Recipe 1 uses product 157 (Char Siu Chicken) which is homemade
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 1, product_id: 157, amount: 2, qu_id: 1 },
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);
        const nestingsByRecipe = new Map<number, RecipeNesting[]>();

        // Recipe 5 produces product 157
        const recipes: Recipe[] = [
          { id: 5, name: 'Char Siu Chicken', base_servings: 2, desired_servings: 2, product_id: 157 },
        ];
        const recipeMap = createRecipeMap(recipes);
        const homemadeProductMap = service.buildHomemadeProductMap(recipes);

        // We have 5 in stock
        const stockMap = new Map<number, number>([[157, 5]]);
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          1,
          1,
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        // Should return empty - homemade product is in stock, no need to buy anything
        expect(result.size).toBe(0);
        // Should track that we used 2 from stock
        expect(homemadeStockUsed.get(157)).toBe(2);
      });

      it('should resolve homemade product to base ingredients when not in stock', () => {
        // Recipe 1 (main) uses product 157 (Char Siu Chicken)
        // Recipe 5 produces product 157 and uses products 55 (chicken) and 133 (salt)
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 1, product_id: 157, amount: 2, qu_id: 1 },
          { id: 2, recipe_id: 5, product_id: 55, amount: 2, qu_id: 2 }, // Chicken Thighs
          { id: 3, recipe_id: 5, product_id: 133, amount: 3, qu_id: 3 }, // Salt
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);
        const nestingsByRecipe = new Map<number, RecipeNesting[]>();

        const recipes: Recipe[] = [
          { id: 5, name: 'Char Siu Chicken', base_servings: 2, desired_servings: 2, product_id: 157 },
        ];
        const recipeMap = createRecipeMap(recipes);
        const homemadeProductMap = service.buildHomemadeProductMap(recipes);

        // No stock of homemade product
        const stockMap = new Map<number, number>();
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          1,
          1,
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        // Should resolve to base ingredients
        // Need 2 of product 157, recipe 5 makes 2 (base_servings), so multiplier = 1
        expect(result.size).toBe(2);
        expect(result.get(55)).toEqual({ amount: 2, qu_id: 2 }); // Chicken
        expect(result.get(133)).toEqual({ amount: 3, qu_id: 3 }); // Salt
        expect(result.has(157)).toBe(false); // Homemade product NOT in result
      });

      it('should handle partial stock of homemade product', () => {
        // Need 4 Char Siu Chicken, have 1 in stock, need to make 3 more
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 1, product_id: 157, amount: 4, qu_id: 1 },
          { id: 2, recipe_id: 5, product_id: 55, amount: 2, qu_id: 2 }, // 2 chicken per 2 servings
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);
        const nestingsByRecipe = new Map<number, RecipeNesting[]>();

        const recipes: Recipe[] = [
          { id: 5, name: 'Char Siu Chicken', base_servings: 2, desired_servings: 2, product_id: 157 },
        ];
        const recipeMap = createRecipeMap(recipes);
        const homemadeProductMap = service.buildHomemadeProductMap(recipes);

        // Only 1 in stock
        const stockMap = new Map<number, number>([[157, 1]]);
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          1,
          1,
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        // Need to make 3 more (4 needed - 1 in stock)
        // Recipe makes 2 per base_servings, so multiplier = 3/2 = 1.5
        // Chicken: 2 * 1.5 = 3
        expect(result.get(55)).toEqual({ amount: 3, qu_id: 2 });
        expect(homemadeStockUsed.get(157)).toBe(1); // Used 1 from stock
      });

      it('should track cumulative homemade stock usage across calls', () => {
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 1, product_id: 157, amount: 2, qu_id: 1 },
          { id: 2, recipe_id: 5, product_id: 55, amount: 2, qu_id: 2 },
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);
        const nestingsByRecipe = new Map<number, RecipeNesting[]>();

        const recipes: Recipe[] = [
          { id: 5, name: 'Char Siu Chicken', base_servings: 2, desired_servings: 2, product_id: 157 },
        ];
        const recipeMap = createRecipeMap(recipes);
        const homemadeProductMap = service.buildHomemadeProductMap(recipes);

        // Have 3 in stock
        const stockMap = new Map<number, number>([[157, 3]]);
        const homemadeStockUsed = new Map<number, number>();

        // First call - uses 2, leaves 1
        const visited1 = new Set<number>();
        service.resolveRecipeIngredients(
          1, 1, ingredientsByRecipe, nestingsByRecipe, recipeMap,
          homemadeProductMap, stockMap, homemadeStockUsed, visited1,
        );
        expect(homemadeStockUsed.get(157)).toBe(2);

        // Second call - only 1 left, need to make 1 more
        const visited2 = new Set<number>();
        const result = service.resolveRecipeIngredients(
          1, 1, ingredientsByRecipe, nestingsByRecipe, recipeMap,
          homemadeProductMap, stockMap, homemadeStockUsed, visited2,
        );

        expect(homemadeStockUsed.get(157)).toBe(3); // 2 + 1 = 3 used total
        expect(result.get(55)).toEqual({ amount: 1, qu_id: 2 }); // Need to make 1 * (2/2) = 1 chicken
      });
    });

    describe('nested/included recipes', () => {
      it('should resolve ingredients from included recipes', () => {
        // Recipe 7 (Buttered Bagel and Coffee) includes Recipe 3 (Buttered Bagel)
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 3, product_id: 32, amount: 1, qu_id: 1 }, // Bagel
          { id: 2, recipe_id: 3, product_id: 33, amount: 0.5, qu_id: 2 }, // Butter
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);

        const nestings: RecipeNesting[] = [
          { id: 1, recipe_id: 7, includes_recipe_id: 3, servings: 1 },
        ];
        const nestingsByRecipe = createNestingsByRecipe(nestings);

        const recipes: Recipe[] = [
          { id: 3, name: 'Buttered Bagel', base_servings: 1, desired_servings: 1 },
          { id: 7, name: 'Buttered Bagel and Coffee', base_servings: 1, desired_servings: 1 },
        ];
        const recipeMap = createRecipeMap(recipes);
        const homemadeProductMap = new Map<number, Recipe>();
        const stockMap = new Map<number, number>();
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          7, // Main recipe
          1,
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        expect(result.size).toBe(2);
        expect(result.get(32)).toEqual({ amount: 1, qu_id: 1 }); // Bagel
        expect(result.get(33)).toEqual({ amount: 0.5, qu_id: 2 }); // Butter
        expect(visited.has(7)).toBe(true);
        expect(visited.has(3)).toBe(true);
      });

      it('should handle multiple included recipes', () => {
        // Recipe 7 includes both Recipe 2 (Coffee) and Recipe 3 (Bagel)
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 2, product_id: 24, amount: 15, qu_id: 1 }, // Coffee beans
          { id: 2, recipe_id: 3, product_id: 32, amount: 1, qu_id: 2 }, // Bagel
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);

        const nestings: RecipeNesting[] = [
          { id: 1, recipe_id: 7, includes_recipe_id: 2, servings: 1 },
          { id: 2, recipe_id: 7, includes_recipe_id: 3, servings: 1 },
        ];
        const nestingsByRecipe = createNestingsByRecipe(nestings);

        const recipes: Recipe[] = [
          { id: 2, name: 'Cup of Coffee', base_servings: 1, desired_servings: 1 },
          { id: 3, name: 'Buttered Bagel', base_servings: 1, desired_servings: 1 },
          { id: 7, name: 'Buttered Bagel and Coffee', base_servings: 1, desired_servings: 1 },
        ];
        const recipeMap = createRecipeMap(recipes);
        const homemadeProductMap = new Map<number, Recipe>();
        const stockMap = new Map<number, number>();
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          7,
          1,
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        expect(result.size).toBe(2);
        expect(result.get(24)).toEqual({ amount: 15, qu_id: 1 }); // Coffee
        expect(result.get(32)).toEqual({ amount: 1, qu_id: 2 }); // Bagel
      });

      it('should apply nesting servings multiplier', () => {
        // Recipe 10 includes 2 servings of Recipe 3
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 3, product_id: 32, amount: 1, qu_id: 1 }, // 1 bagel per serving
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);

        const nestings: RecipeNesting[] = [
          { id: 1, recipe_id: 10, includes_recipe_id: 3, servings: 2 }, // 2 servings
        ];
        const nestingsByRecipe = createNestingsByRecipe(nestings);

        const recipes: Recipe[] = [
          { id: 3, name: 'Buttered Bagel', base_servings: 1, desired_servings: 1 },
          { id: 10, name: 'Double Bagel', base_servings: 1, desired_servings: 1 },
        ];
        const recipeMap = createRecipeMap(recipes);
        const homemadeProductMap = new Map<number, Recipe>();
        const stockMap = new Map<number, number>();
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          10,
          1,
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        // 2 servings of recipe with 1 bagel each = 2 bagels
        expect(result.get(32)).toEqual({ amount: 2, qu_id: 1 });
      });
    });

    describe('circular dependency detection', () => {
      it('should detect and skip circular dependencies', () => {
        // Recipe 1 includes Recipe 2, which includes Recipe 1 (circular)
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 1, product_id: 10, amount: 1, qu_id: 1 },
          { id: 2, recipe_id: 2, product_id: 20, amount: 1, qu_id: 1 },
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);

        const nestings: RecipeNesting[] = [
          { id: 1, recipe_id: 1, includes_recipe_id: 2, servings: 1 },
          { id: 2, recipe_id: 2, includes_recipe_id: 1, servings: 1 }, // Circular!
        ];
        const nestingsByRecipe = createNestingsByRecipe(nestings);

        const recipes: Recipe[] = [
          { id: 1, name: 'Recipe 1', base_servings: 1, desired_servings: 1 },
          { id: 2, name: 'Recipe 2', base_servings: 1, desired_servings: 1 },
        ];
        const recipeMap = createRecipeMap(recipes);
        const homemadeProductMap = new Map<number, Recipe>();
        const stockMap = new Map<number, number>();
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        // Should not throw, should handle gracefully
        const result = service.resolveRecipeIngredients(
          1,
          1,
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        // Should get ingredients from recipe 1 and 2, but not loop infinitely
        expect(result.get(10)).toEqual({ amount: 1, qu_id: 1 });
        expect(result.get(20)).toEqual({ amount: 1, qu_id: 1 });
      });
    });

    describe('complex scenarios', () => {
      it('should handle nested recipe with homemade product', () => {
        // Recipe 11 (Char Siu on Rice) includes:
        // - Direct ingredient: product 78 (rice)
        // - Via nesting: uses product 157 (Char Siu Chicken) which is homemade
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 11, product_id: 78, amount: 100, qu_id: 1 }, // Rice
          { id: 2, recipe_id: 11, product_id: 157, amount: 2, qu_id: 2 }, // Char Siu (homemade)
          { id: 3, recipe_id: 5, product_id: 55, amount: 2, qu_id: 3 }, // Chicken for Char Siu
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);
        const nestingsByRecipe = new Map<number, RecipeNesting[]>();

        const recipes: Recipe[] = [
          { id: 5, name: 'Char Siu Chicken', base_servings: 2, desired_servings: 2, product_id: 157 },
          { id: 11, name: 'Char Siu on Rice', base_servings: 1, desired_servings: 1 },
        ];
        const recipeMap = createRecipeMap(recipes);
        const homemadeProductMap = service.buildHomemadeProductMap(recipes);

        // No Char Siu in stock
        const stockMap = new Map<number, number>();
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          11,
          1,
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        expect(result.size).toBe(2);
        expect(result.get(78)).toEqual({ amount: 100, qu_id: 1 }); // Rice
        expect(result.get(55)).toEqual({ amount: 2, qu_id: 3 }); // Chicken (resolved from Char Siu)
        expect(result.has(157)).toBe(false); // Char Siu NOT in result (resolved)
      });

      it('should combine multipliers correctly: meal servings × nesting servings', () => {
        // Meal requests 2 servings of Recipe 7
        // Recipe 7 includes 1 serving of Recipe 3 (base_servings: 1)
        // Recipe 3 needs 1 bagel per serving
        // Total: 2 * 1 * 1 = 2 bagels
        const ingredients: RecipeIngredient[] = [
          { id: 1, recipe_id: 3, product_id: 32, amount: 1, qu_id: 1 },
        ];
        const ingredientsByRecipe = createIngredientsByRecipe(ingredients);

        const nestings: RecipeNesting[] = [
          { id: 1, recipe_id: 7, includes_recipe_id: 3, servings: 1 },
        ];
        const nestingsByRecipe = createNestingsByRecipe(nestings);

        const recipes: Recipe[] = [
          { id: 3, name: 'Buttered Bagel', base_servings: 1, desired_servings: 1 },
          { id: 7, name: 'Breakfast', base_servings: 1, desired_servings: 1 },
        ];
        const recipeMap = createRecipeMap(recipes);
        const homemadeProductMap = new Map<number, Recipe>();
        const stockMap = new Map<number, number>();
        const homemadeStockUsed = new Map<number, number>();
        const visited = new Set<number>();

        const result = service.resolveRecipeIngredients(
          7,
          2, // 2 servings requested
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

        expect(result.get(32)).toEqual({ amount: 2, qu_id: 1 }); // 2 bagels
      });
    });
  });
});
