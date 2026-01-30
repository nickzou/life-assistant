import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GrocyService } from './grocy.service';
import { GrocyController } from './grocy.controller';

@Module({
  imports: [ConfigModule],
  controllers: [GrocyController],
  providers: [GrocyService],
  exports: [GrocyService],
})
export class GrocyModule {}
