import { Module } from '@nestjs/common';
import { Sch7ReportesService } from './sch7-reportes.service';
import { Sch7ReportesController } from './sch7-reportes.controller';
import { Sch8DocumentosModule } from '../sch8-documentos/sch8-documentos.module';

@Module({
  imports: [Sch8DocumentosModule],
  controllers: [Sch7ReportesController],
  providers: [Sch7ReportesService],
  exports: [Sch7ReportesService],
})
export class Sch7ReportesModule {}
