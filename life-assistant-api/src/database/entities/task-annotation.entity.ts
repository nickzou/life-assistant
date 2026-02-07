import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('task_annotations')
@Index(['task_id', 'source'], { unique: true })
export class TaskAnnotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  task_id: string;

  @Column()
  source: string;

  @Column({ nullable: true })
  time_of_day: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
