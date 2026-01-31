import { Module, forwardRef } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WrikeModule } from '../wrike/wrike.module';
import { ClickUpModule } from '../clickup/clickup.module';
import { SyncModule } from '../sync/sync.module';
import { TaskInsightsModule } from '../task-insights/task-insights.module';

@Module({
  imports: [
    WrikeModule,
    ClickUpModule,
    SyncModule,
    forwardRef(() => TaskInsightsModule),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
