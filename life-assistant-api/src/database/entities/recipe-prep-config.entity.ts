import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('recipe_prep_configs')
export class RecipePrepConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Index()
  grocy_recipe_id: number;

  @Column({ default: false })
  requires_defrost: boolean;

  @Column({ nullable: true })
  defrost_item: string; // "chicken thighs", "pork shoulder"

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
