import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealPrepService } from './meal-prep.service';
import { RecipePrepConfig } from '@database/entities/recipe-prep-config.entity';
import { MealPlanTaskMapping } from '@database/entities/meal-plan-task-mapping.entity';
import { ClickUpModule } from '@clickup/clickup.module';
import { GrocyModule } from '@grocy/grocy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecipePrepConfig, MealPlanTaskMapping]),
    ClickUpModule,
    forwardRef(() => GrocyModule),
  ],
  providers: [MealPrepService],
  exports: [MealPrepService],
})
export class MealPrepModule {}
