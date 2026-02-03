import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClickUpService } from './clickup.service';

describe('ClickUpService', () => {
  let service: ClickUpService;
  let mockAxiosInstance: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickUpService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-token'),
          },
        },
      ],
    }).compile();

    service = module.get<ClickUpService>(ClickUpService);

    // Access the private axios instance and mock it
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    (service as any).axiosInstance = mockAxiosInstance;
  });

  describe('getCurrentUserId', () => {
    it('should return null before initialization', () => {
      expect(service.getCurrentUserId()).toBeNull();
    });
  });

  describe('getTasksByDateRange', () => {
    const workspaceId = 'workspace-123';

    it('should fetch tasks with correct params', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { tasks: [{ id: '1' }, { id: '2' }] },
      });

      const result = await service.getTasksByDateRange(
        workspaceId,
        1000,
        2000,
      );

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/team/${workspaceId}/task`,
        {
          params: {
            due_date_gt: 1000,
            due_date_lt: 2000,
            subtasks: true,
            include_closed: false,
          },
        },
      );
      expect(result).toHaveLength(2);
    });

    it('should include closed tasks when specified', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { tasks: [] },
      });

      await service.getTasksByDateRange(workspaceId, 1000, 2000, {
        includeClosed: true,
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/team/${workspaceId}/task`,
        expect.objectContaining({
          params: expect.objectContaining({
            include_closed: true,
          }),
        }),
      );
    });

    it('should return empty array when no tasks', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {},
      });

      const result = await service.getTasksByDateRange(
        workspaceId,
        1000,
        2000,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getOverdueTasks', () => {
    const workspaceId = 'workspace-123';

    it('should filter out completed tasks', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          tasks: [
            { id: '1', status: { type: 'open' } },
            { id: '2', status: { type: 'done' } },
            { id: '3', status: { type: 'closed' } },
            { id: '4', status: { type: 'open' } },
          ],
        },
      });

      const result = await service.getOverdueTasks(workspaceId, 1000);

      expect(result).toHaveLength(2);
      expect(result.map((t: any) => t.id)).toEqual(['1', '4']);
    });

    it('should return empty array when all tasks completed', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          tasks: [
            { id: '1', status: { type: 'done' } },
            { id: '2', status: { type: 'closed' } },
          ],
        },
      });

      const result = await service.getOverdueTasks(workspaceId, 1000);

      expect(result).toEqual([]);
    });
  });
});
