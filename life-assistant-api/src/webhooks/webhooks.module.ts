import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WrikeModule } from '../wrike/wrike.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [WrikeModule, SyncModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
