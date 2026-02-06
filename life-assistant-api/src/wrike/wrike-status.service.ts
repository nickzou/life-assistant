import { Injectable, Logger } from '@nestjs/common';
import { WrikeService } from './wrike.service';
import { WrikeCustomStatus } from './types/wrike-api.types';

export interface WrikeStatusInfo {
  name: string;
  group: 'Active' | 'Completed' | 'Deferred' | 'Cancelled';
  color: string;
}

@Injectable()
export class WrikeStatusService {
  private readonly logger = new Logger(WrikeStatusService.name);
  private statusMap: Map<string, WrikeCustomStatus> | null = null;

  constructor(private readonly wrikeService: WrikeService) {}

  async getStatusInfo(customStatusId: string): Promise<WrikeStatusInfo | null> {
    const map = await this.getStatusMap();
    const status = map.get(customStatusId);
    if (!status) {
      this.logger.warn(`Unknown custom status ID: ${customStatusId}`);
      return null;
    }
    return {
      name: status.name,
      group: status.group,
      color: status.color,
    };
  }

  private async getStatusMap(): Promise<Map<string, WrikeCustomStatus>> {
    if (this.statusMap) return this.statusMap;

    this.logger.log('Loading Wrike workflow data for status resolution');
    const workflows = await this.wrikeService.getCustomStatuses();

    this.statusMap = new Map();
    for (const workflow of workflows.data) {
      for (const status of workflow.customStatuses) {
        this.statusMap.set(status.id, status);
      }
    }

    this.logger.log(`Cached ${this.statusMap.size} Wrike custom statuses`);
    return this.statusMap;
  }
}
