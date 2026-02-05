import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WrikeWebhookHandlerService } from './wrike-webhook-handler.service';
import { ClickUpWebhookHandlerService } from './clickup-webhook-handler.service';
import { WrikeModule } from '@wrike/wrike.module';
import { ClickUpModule } from '@clickup/clickup.module';
import { SyncModule } from '@sync/sync.module';
import { GrocyModule } from '@grocy/grocy.module';

@Module({
  imports: [WrikeModule, ClickUpModule, SyncModule, GrocyModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WrikeWebhookHandlerService,
    ClickUpWebhookHandlerService,
  ],
  exports: [
    WebhooksService,
    WrikeWebhookHandlerService,
    ClickUpWebhookHandlerService,
  ],
})
export class WebhooksModule {}
