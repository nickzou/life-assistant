import { Test, TestingModule } from '@nestjs/testing';
import { WrikeStatusService } from './wrike-status.service';
import { WrikeService } from './wrike.service';

describe('WrikeStatusService', () => {
  let service: WrikeStatusService;
  let mockWrikeService: any;

  const mockWorkflowsResponse = {
    kind: 'workflows',
    data: [
      {
        id: 'WF-1',
        name: 'Default Workflow',
        standard: true,
        hidden: false,
        customStatuses: [
          {
            id: 'STATUS-ACTIVE',
            name: 'Assigned',
            standardName: false,
            standard: false,
            color: 'Blue1',
            group: 'Active',
            hidden: false,
          },
          {
            id: 'STATUS-DONE',
            name: 'Completed',
            standardName: true,
            standard: true,
            color: 'Green1',
            group: 'Completed',
            hidden: false,
          },
        ],
      },
      {
        id: 'WF-2',
        name: 'Custom Workflow',
        standard: false,
        hidden: false,
        customStatuses: [
          {
            id: 'STATUS-DEFERRED',
            name: 'On Hold',
            standardName: false,
            standard: false,
            color: 'Purple1',
            group: 'Deferred',
            hidden: false,
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    mockWrikeService = {
      getCustomStatuses: jest.fn().mockResolvedValue(mockWorkflowsResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WrikeStatusService,
        { provide: WrikeService, useValue: mockWrikeService },
      ],
    }).compile();

    service = module.get<WrikeStatusService>(WrikeStatusService);
  });

  describe('getStatusInfo', () => {
    it('should resolve a known custom status ID', async () => {
      const result = await service.getStatusInfo('STATUS-ACTIVE');

      expect(result).toEqual({
        name: 'Assigned',
        group: 'Active',
        color: 'Blue1',
      });
    });

    it('should resolve statuses from different workflows', async () => {
      const result = await service.getStatusInfo('STATUS-DEFERRED');

      expect(result).toEqual({
        name: 'On Hold',
        group: 'Deferred',
        color: 'Purple1',
      });
    });

    it('should return null for unknown status ID', async () => {
      const result = await service.getStatusInfo('UNKNOWN-ID');

      expect(result).toBeNull();
    });

    it('should lazy-load and cache workflow data', async () => {
      await service.getStatusInfo('STATUS-ACTIVE');
      await service.getStatusInfo('STATUS-DONE');
      await service.getStatusInfo('STATUS-DEFERRED');

      expect(mockWrikeService.getCustomStatuses).toHaveBeenCalledTimes(1);
    });

    it('should return correct info for completed status', async () => {
      const result = await service.getStatusInfo('STATUS-DONE');

      expect(result).toEqual({
        name: 'Completed',
        group: 'Completed',
        color: 'Green1',
      });
    });
  });
});
