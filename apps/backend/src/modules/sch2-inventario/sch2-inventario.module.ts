import { Module } from '@nestjs/common';
import { Sch2InventarioService } from './sch2-inventario.service';
import { Sch2InventarioController } from './sch2-inventario.controller';

@Module({
  controllers: [Sch2InventarioController],
  providers: [Sch2InventarioService],
  exports: [Sch2InventarioService],
})
export class Sch2InventarioModule {}
