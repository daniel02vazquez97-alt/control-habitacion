import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('SCH-8 Generación de Documentos')
@Controller('documentos')
export class Sch8DocumentosController {
  private readonly storageDir = path.resolve(process.cwd(), 'generated-pdfs');

  @Get('pdf/:nombreArchivo')
  @ApiOperation({ summary: 'Descargar o visualizar un PDF generado (FR08-03 o FR08-02)' })
  @ApiParam({ name: 'nombreArchivo', example: 'FR08-03-2026-0001.pdf' })
  descargarPdf(@Param('nombreArchivo') nombreArchivo: string, @Res() res: Response) {
    const cleanName = path.basename(nombreArchivo);
    const filePath = path.join(this.storageDir, cleanName);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException({
        codigo: 'PDF_NO_ENCONTRADO',
        mensaje: `El documento ${cleanName} no fue encontrado en el servidor.`,
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${cleanName}"`);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}
