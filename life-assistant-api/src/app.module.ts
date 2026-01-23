import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { WrikeModule } from './wrike/wrike.module';
import { ClickUpModule } from './clickup/clickup.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { GrocyModule } from './grocy/grocy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    WrikeModule,
    ClickUpModule,
    WebhooksModule,
    GrocyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
