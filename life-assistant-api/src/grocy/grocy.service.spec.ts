import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GrocyService } from './grocy.service';

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

  describe('getEnrichedShoppingListItems', () => {
    it('should enrich items with product names and quantity units', async () => {
      const mockItems = [
        { id: 1, product_id: 5, amount: 2, done: false, shopping_list_id: 1 },
        { id: 2, product_id: null, note: 'Custom item', amount: 1, done: false, shopping_list_id: 1 },
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
});
