import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  source_platform: string;

  @Column()
  target_platform: string;

  @Column()
  source_task_id: string;

  @Column()
  target_task_id: string;

  @Column()
  action: string; // 'create', 'update', 'delete'

  @Column()
  status: string; // 'success', 'failed'

  @Column('text', { nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;
}
