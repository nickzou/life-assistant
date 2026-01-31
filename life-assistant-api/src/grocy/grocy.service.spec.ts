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
});
