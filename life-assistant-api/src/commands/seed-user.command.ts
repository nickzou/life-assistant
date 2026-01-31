import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
        entities: [User],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([User]),
    JwtModule.register({ secret: 'not-used-for-seeding' }),
  ],
  providers: [AuthService],
})
class SeedUserModule {}

async function bootstrap() {
  const args = process.argv.slice(2);
  const emailArg = args.find((arg) => arg.startsWith('--email='));
  const passwordArg = args.find((arg) => arg.startsWith('--password='));

  if (!emailArg || !passwordArg) {
    console.error(
      'Usage: npm run seed:user -- --email=you@example.com --password=yourpassword',
    );
    process.exit(1);
  }

  const email = emailArg.split('=')[1];
  const password = passwordArg.split('=')[1];

  if (!email || !password) {
    console.error('Email and password are required');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(SeedUserModule);
  const authService = app.get(AuthService);

  try {
    const user = await authService.createUser(email, password);
    console.log(`User created successfully:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
  } catch (error) {
    console.error('Failed to create user:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
