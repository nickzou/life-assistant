import { Module } from '@nestjs/common';
import { WrikeService } from './wrike.service';
import { WrikeController } from './wrike.controller';

@Module({
  controllers: [WrikeController],
  providers: [WrikeService],
  exports: [WrikeService],
})
export class WrikeModule {}
