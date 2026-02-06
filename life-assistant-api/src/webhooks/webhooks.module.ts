import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ClickUpWebhookHandlerService } from './clickup-webhook-handler.service';
import { WrikeModule } from '@wrike/wrike.module';
import { ClickUpModule } from '@clickup/clickup.module';
import { GrocyModule } from '@grocy/grocy.module';

@Module({
  imports: [WrikeModule, ClickUpModule, GrocyModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, ClickUpWebhookHandlerService],
  exports: [WebhooksService, ClickUpWebhookHandlerService],
})
export class WebhooksModule {}
