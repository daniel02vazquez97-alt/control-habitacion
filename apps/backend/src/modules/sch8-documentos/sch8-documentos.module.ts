import { Module } from '@nestjs/common';
import { Sch8DocumentosService } from './sch8-documentos.service';
import { Sch8DocumentosController } from './sch8-documentos.controller';

@Module({
  controllers: [Sch8DocumentosController],
  providers: [Sch8DocumentosService],
  exports: [Sch8DocumentosService],
})
export class Sch8DocumentosModule {}
