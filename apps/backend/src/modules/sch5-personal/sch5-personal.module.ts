import { Module } from '@nestjs/common';
import { Sch5PersonalService } from './sch5-personal.service';
import { Sch5PersonalController } from './sch5-personal.controller';

@Module({
  controllers: [Sch5PersonalController],
  providers: [Sch5PersonalService],
  exports: [Sch5PersonalService],
})
export class Sch5PersonalModule {}
