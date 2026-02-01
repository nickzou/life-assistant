import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GrocyService } from './grocy.service';
import { GrocyController } from './grocy.controller';
import { MealPrepModule } from '../meal-prep/meal-prep.module';

@Module({
  imports: [ConfigModule, forwardRef(() => MealPrepModule)],
  controllers: [GrocyController],
  providers: [GrocyService],
  exports: [GrocyService],
})
export class GrocyModule {}
