import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GrocyService } from './grocy.service';
import { GrocyRecipeService } from './grocy-recipe.service';
import { GrocyShoppingService } from './grocy-shopping.service';
import { GrocyMealPlanService } from './grocy-meal-plan.service';
import { GrocyController } from './grocy.controller';
import { MealPrepModule } from '@meal-prep/meal-prep.module';

@Module({
  imports: [ConfigModule, forwardRef(() => MealPrepModule)],
  controllers: [GrocyController],
  providers: [
    GrocyService,
    GrocyRecipeService,
    GrocyShoppingService,
    GrocyMealPlanService,
  ],
  exports: [
    GrocyService,
    GrocyRecipeService,
    GrocyShoppingService,
    GrocyMealPlanService,
  ],
})
export class GrocyModule {}
