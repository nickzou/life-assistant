import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { WrikeModule } from './wrike/wrike.module';
import { ClickUpModule } from './clickup/clickup.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { GrocyModule } from './grocy/grocy.module';
import { AuthModule } from './auth/auth.module';
import { TaskInsightsModule } from './task-insights/task-insights.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    WrikeModule,
    ClickUpModule,
    WebhooksModule,
    GrocyModule,
    TaskInsightsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
