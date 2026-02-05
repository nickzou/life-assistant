import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { WrikeModule } from '@wrike/wrike.module';
import { ClickUpModule } from '@clickup/clickup.module';
import { TaskMapping } from '@database/entities/task-mapping.entity';
import { SyncLog } from '@database/entities/sync-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskMapping, SyncLog]),
    WrikeModule,
    ClickUpModule,
  ],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
