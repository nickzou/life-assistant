import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TaskMapping } from './entities/task-mapping.entity';
import { SyncLog } from './entities/sync-log.entity';
import { User } from './entities/user.entity';
import { RecipePrepConfig } from './entities/recipe-prep-config.entity';
import { MealPlanTaskMapping } from './entities/meal-plan-task-mapping.entity';
import { TaskAnnotation } from './entities/task-annotation.entity';
import { DatabaseService } from './database.service';
import { InitialSchema1737420000000 } from './migrations/1737420000000-InitialSchema';
import { AddMealPrepTables1738400000000 } from './migrations/1738400000000-AddMealPrepTables';
import { AddTaskAnnotations1738500000000 } from './migrations/1738500000000-AddTaskAnnotations';

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
        entities: [
          TaskMapping,
          SyncLog,
          User,
          RecipePrepConfig,
          MealPlanTaskMapping,
          TaskAnnotation,
        ],
        migrations: [
          InitialSchema1737420000000,
          AddMealPrepTables1738400000000,
          AddTaskAnnotations1738500000000,
        ],
        migrationsRun: true, // Auto-run migrations on startup
        synchronize: false, // Never use synchronize in production
        logging: configService.get('NODE_ENV') !== 'production',
      }),
    }),
    TypeOrmModule.forFeature([
      TaskMapping,
      SyncLog,
      User,
      RecipePrepConfig,
      MealPlanTaskMapping,
      TaskAnnotation,
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
