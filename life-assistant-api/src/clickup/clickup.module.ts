import { Module } from '@nestjs/common';
import { ClickUpService } from './clickup.service';
import { ClickUpController } from './clickup.controller';

@Module({
  controllers: [ClickUpController],
  providers: [ClickUpService],
  exports: [ClickUpService],
})
export class ClickUpModule {}
