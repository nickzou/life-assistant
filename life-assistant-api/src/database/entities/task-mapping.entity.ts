import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('task_mappings')
export class TaskMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  wrike_id: string;

  @Column({ unique: true })
  @Index()
  clickup_id: string;

  @Column()
  integration_type: string; // 'wrike-clickup', 'jira-clickup', etc.

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Index()
  @Column({ nullable: true })
  user_id: string; // For multi-user support
}
