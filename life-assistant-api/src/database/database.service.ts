import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskMapping } from './entities/task-mapping.entity';
import { SyncLog } from './entities/sync-log.entity';
import { User } from './entities/user.entity';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectRepository(TaskMapping)
    private taskMappingRepository: Repository<TaskMapping>,
    @InjectRepository(SyncLog)
    private syncLogRepository: Repository<SyncLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Task Mapping Methods
  async saveMapping(mapping: Partial<TaskMapping>): Promise<TaskMapping> {
    const newMapping = this.taskMappingRepository.create(mapping);
    return this.taskMappingRepository.save(newMapping);
  }

  async findMappingByWrikeId(wrikeId: string): Promise<TaskMapping | null> {
    return this.taskMappingRepository.findOne({ where: { wrike_id: wrikeId } });
  }

  async findMappingByClickUpId(clickupId: string): Promise<TaskMapping | null> {
    return this.taskMappingRepository.findOne({
      where: { clickup_id: clickupId },
    });
  }

  async getAllMappings(): Promise<TaskMapping[]> {
    return this.taskMappingRepository.find();
  }

  async deleteMapping(id: string): Promise<void> {
    await this.taskMappingRepository.delete(id);
  }

  // Sync Log Methods
  async createSyncLog(log: Partial<SyncLog>): Promise<SyncLog> {
    const newLog = this.syncLogRepository.create(log);
    return this.syncLogRepository.save(newLog);
  }

  async getRecentSyncLogs(limit: number = 50): Promise<SyncLog[]> {
    return this.syncLogRepository.find({
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async getSyncLogById(id: string): Promise<SyncLog | null> {
    return this.syncLogRepository.findOne({ where: { id } });
  }

  // User Methods (for future multi-user support)
  async createUser(user: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateUserTokens(
    userId: string,
    wrikeToken?: string,
    clickupToken?: string,
  ): Promise<User> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (wrikeToken) user.wrike_token = wrikeToken;
    if (clickupToken) user.clickup_token = clickupToken;
    return this.userRepository.save(user);
  }
}
