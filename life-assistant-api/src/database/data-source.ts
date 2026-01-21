import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { TaskMapping } from './entities/task-mapping.entity';
import { SyncLog } from './entities/sync-log.entity';
import { User } from './entities/user.entity';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'life_assistant',
  entities: [TaskMapping, SyncLog, User],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  logging: true,
});
