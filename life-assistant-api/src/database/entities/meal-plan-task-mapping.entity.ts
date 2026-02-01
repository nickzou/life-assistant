import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('meal_plan_task_mappings')
export class MealPlanTaskMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  meal_plan_item_id: number; // Grocy meal plan item ID

  @Column()
  @Index()
  clickup_task_id: string;

  @Column()
  task_type: string; // 'main' | 'defrost'

  @CreateDateColumn()
  created_at: Date;
}
