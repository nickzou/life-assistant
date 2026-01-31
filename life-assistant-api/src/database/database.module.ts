import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TaskMapping } from './entities/task-mapping.entity';
import { SyncLog } from './entities/sync-log.entity';
import { User } from './entities/user.entity';
import { DueDateChange } from './entities/due-date-change.entity';
import { DatabaseService } from './database.service';
import { InitialSchema1737420000000 } from './migrations/1737420000000-InitialSchema';
import { AddDueDateChanges1738300000000 } from './migrations/1738300000000-AddDueDateChanges';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [TaskMapping, SyncLog, User, DueDateChange],
        migrations: [
          InitialSchema1737420000000,
          AddDueDateChanges1738300000000,
        ],
        migrationsRun: true, // Auto-run migrations on startup
        synchronize: false, // Never use synchronize in production
        logging: configService.get('NODE_ENV') !== 'production',
      }),
    }),
    TypeOrmModule.forFeature([TaskMapping, SyncLog, User, DueDateChange]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
