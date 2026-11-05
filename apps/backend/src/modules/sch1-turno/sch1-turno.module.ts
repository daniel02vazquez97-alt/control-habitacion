import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Sch1TurnoService } from './sch1-turno.service';
import { Sch1TurnoController } from './sch1-turno.controller';
import { Sch2InventarioModule } from '../sch2-inventario/sch2-inventario.module';
import { Sch7ReportesModule } from '../sch7-reportes/sch7-reportes.module';
import { Sch3NotificacionesModule } from '../sch3-notificaciones/sch3-notificaciones.module';

@Module({
  imports: [ConfigModule, Sch2InventarioModule, Sch7ReportesModule, Sch3NotificacionesModule],
  controllers: [Sch1TurnoController],
  providers: [Sch1TurnoService],
  exports: [Sch1TurnoService],
})
export class Sch1TurnoModule {}
