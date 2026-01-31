import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('due_date_changes')
export class DueDateChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  clickup_task_id: string;

  @Column({ type: 'bigint', nullable: true })
  previous_due_date: number | null; // Unix timestamp ms

  @Column({ type: 'bigint', nullable: true })
  new_due_date: number | null; // Unix timestamp ms

  @CreateDateColumn()
  changed_at: Date;
}
