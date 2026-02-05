import { Injectable, Logger } from '@nestjs/common';
import { GrocyService } from './grocy.service';
import {
  MealPlanItem,
  MealPlanSection,
  CreateMealPlanItemDto,
} from './grocy.types';

@Injectable()
export class GrocyMealPlanService {
  private readonly logger = new Logger(GrocyMealPlanService.name);

  constructor(private readonly grocyService: GrocyService) {}

  /**
   * Get all meal plan entries
   */
  async getMealPlan(): Promise<MealPlanItem[]> {
    return this.grocyService.getMealPlan();
  }

  /**
   * Get meal plan for a specific date
   */
  async getMealPlanForDate(date: string): Promise<MealPlanItem[]> {
    return this.grocyService.getMealPlanForDate(date);
  }

  /**
   * Get meal plan entries for a date range
   */
  async getMealPlanForDateRange(
    startDate: string,
    endDate: string,
  ): Promise<MealPlanItem[]> {
    return this.grocyService.getMealPlanForDateRange(startDate, endDate);
  }

  /**
   * Get all meal plan sections
   */
  async getMealPlanSections(): Promise<MealPlanSection[]> {
    return this.grocyService.getMealPlanSections();
  }

  /**
   * Create a new meal plan item
   */
  async createMealPlanItem(data: CreateMealPlanItemDto): Promise<MealPlanItem> {
    return this.grocyService.createMealPlanItem(data);
  }

  /**
   * Delete a meal plan item
   */
  async deleteMealPlanItem(id: number): Promise<void> {
    return this.grocyService.deleteMealPlanItem(id);
  }

  /**
   * Update meal plan item done status
   */
  async updateMealPlanItemDone(id: number, done: boolean): Promise<void> {
    return this.grocyService.updateMealPlanItemDone(id, done);
  }

  /**
   * Update a meal plan item
   */
  async updateMealPlanItem(
    id: number,
    data: { section_id?: number; recipe_servings?: number },
  ): Promise<void> {
    return this.grocyService.updateMealPlanItem(id, data);
  }
}
