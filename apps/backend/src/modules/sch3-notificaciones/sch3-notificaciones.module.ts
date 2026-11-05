import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Sch3NotificacionesService } from './sch3-notificaciones.service';
import { Sch3NotificacionesController } from './sch3-notificaciones.controller';
import { Sch2InventarioModule } from '../sch2-inventario/sch2-inventario.module';

@Module({
  imports: [ConfigModule, Sch2InventarioModule],
  controllers: [Sch3NotificacionesController],
  providers: [Sch3NotificacionesService],
  exports: [Sch3NotificacionesService],
})
export class Sch3NotificacionesModule {}
