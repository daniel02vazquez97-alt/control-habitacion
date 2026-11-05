import { Module } from '@nestjs/common';
import { Sch6InspeccionService } from './sch6-inspeccion.service';
import { Sch6InspeccionController } from './sch6-inspeccion.controller';
import { Sch2InventarioModule } from '../sch2-inventario/sch2-inventario.module';

@Module({
  imports: [Sch2InventarioModule],
  controllers: [Sch6InspeccionController],
  providers: [Sch6InspeccionService],
  exports: [Sch6InspeccionService],
})
export class Sch6InspeccionModule {}
