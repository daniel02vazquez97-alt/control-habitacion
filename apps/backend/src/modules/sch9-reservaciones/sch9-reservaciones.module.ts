import { Module } from '@nestjs/common';
import { Sch2InventarioModule } from '../sch2-inventario/sch2-inventario.module';
import { Sch9ReservacionesController } from './sch9-reservaciones.controller';
import { Sch9ReservacionesService } from './sch9-reservaciones.service';

@Module({
  imports: [Sch2InventarioModule],
  controllers: [Sch9ReservacionesController],
  providers: [Sch9ReservacionesService],
})
export class Sch9ReservacionesModule {}
