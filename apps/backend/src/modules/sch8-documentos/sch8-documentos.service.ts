import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export interface DatosReporteFR0803 {
  noReporte: string;
  noHabitacion?: string | null;
  tipoHabitacion?: string | null;
  fecha: string;
  hora: string;
  estadoExterno: string;
  supervisorNombre: string;
  observaciones?: string | null;
}

export interface DatosInspeccionFR0802 {
  noHabitacion: string;
  fecha: string;
  hora: string;
  supervisorNombre: string;
  resultado: string;
  puntos: Array<{
    numero: number;
    descripcion: string;
    cumple: boolean;
    observacion?: string;
  }>;
  hayDanio: boolean;
  descripcionDanio?: string | null;
}

@Injectable()
export class Sch8DocumentosService {
  private readonly logger = new Logger(Sch8DocumentosService.name);
  private readonly storageDir = path.resolve(process.cwd(), 'generated-pdfs');

  constructor() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async generarPdfFR0803(datos: DatosReporteFR0803): Promise<{ buffer: Buffer; filePath: string }> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          const fileName = `${datos.noReporte}.pdf`;
          const filePath = path.join(this.storageDir, fileName);
          fs.writeFileSync(filePath, pdfBuffer);
          this.logger.log(`PDF FR08-03 generado exitosamente: ${filePath}`);
          resolve({ buffer: pdfBuffer, filePath });
        });

        // Encabezado institucional
        doc.rect(40, 40, 515, 60).fillAndStroke('#1E3A8A', '#1E3A8A');
        doc.fontSize(16).fillColor('#FFFFFF').text('RESORT & SPA HOSPEDAJE', 50, 50, { align: 'center' });
        doc.fontSize(12).text('FORMATO FR08-03: REPORTE DE ESTADO DE HABITACIÓN', 50, 72, { align: 'center' });

        doc.moveDown(3);
        doc.fillColor('#000000');

        // Metadatos
        doc.fontSize(10);
        doc.font('Helvetica-Bold').text(`Número de Reporte: `, 50, 120, { continued: true });
        doc.font('Helvetica').text(datos.noReporte);

        doc.font('Helvetica-Bold').text(`Fecha de Emisión: `, 50, 138, { continued: true });
        doc.font('Helvetica').text(`${datos.fecha} a las ${datos.hora} (America/Hermosillo)`);

        doc.font('Helvetica-Bold').text(`Supervisor Responsable: `, 50, 156, { continued: true });
        doc.font('Helvetica').text(datos.supervisorNombre);

        // Tabla de Datos
        doc.rect(50, 185, 495, 110).stroke('#CBD5E1');
        doc.rect(50, 185, 495, 25).fill('#F1F5F9');

        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11);
        doc.text('Habitación', 60, 192);
        doc.text('Tipo', 170, 192);
        doc.text('Estado Externo (Reservaciones)', 300, 192);

        doc.font('Helvetica').fontSize(11).fillColor('#000000');
        doc.text(datos.noHabitacion || 'General (Turno)', 60, 220);
        doc.text(datos.tipoHabitacion || 'N/A', 170, 220);

        // Color badge del estado
        const estadoColor =
          datos.estadoExterno === 'DISPONIBLE'
            ? '#16A34A'
            : datos.estadoExterno === 'BLOQUEADA'
            ? '#DC2626'
            : '#D97706';

        doc.fillColor(estadoColor).font('Helvetica-Bold').text(datos.estadoExterno, 300, 220);

        // Observaciones
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
        doc.text('Observaciones del Procedimiento:', 50, 320);
        doc.font('Helvetica').fontSize(10);
        doc.rect(50, 335, 495, 80).stroke('#E2E8F0');
        doc.text(
          datos.observaciones || 'Sin observaciones adicionales registradas durante este ciclo.',
          60,
          345,
          { width: 475 },
        );

        // Zona de Firma
        doc.rect(180, 480, 235, 1).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(10).text(datos.supervisorNombre, 180, 485, { align: 'center', width: 235 });
        doc.font('Helvetica').fontSize(9).fillColor('#64748B').text('Firma Digital / Supervisor de Housekeeping', 180, 500, { align: 'center', width: 235 });

        // Pie de página
        doc.fontSize(8).fillColor('#94A3B8').text(
          `Documento oficial del Sistema FR08 Hospedaje. Generado el ${new Date().toISOString()}`,
          50,
          780,
          { align: 'center', width: 495 },
        );

        doc.end();
      } catch (err) {
        this.logger.error('Error generando PDF FR08-03', err);
        reject(err);
      }
    });
  }

  async generarPdfFR0802(datos: DatosInspeccionFR0802): Promise<{ buffer: Buffer; filePath: string }> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          const fileName = `FR08-02-HAB-${datos.noHabitacion}-${Date.now()}.pdf`;
          const filePath = path.join(this.storageDir, fileName);
          fs.writeFileSync(filePath, pdfBuffer);
          resolve({ buffer: pdfBuffer, filePath });
        });

        // Encabezado
        doc.rect(40, 40, 515, 60).fillAndStroke('#065F46', '#065F46');
        doc.fontSize(16).fillColor('#FFFFFF').text('RESORT & SPA HOSPEDAJE', 50, 50, { align: 'center' });
        doc.fontSize(12).text('FORMATO FR08-02: LISTA DE CHEQUEO DE INSPECCIÓN', 50, 72, { align: 'center' });

        doc.moveDown(3);
        doc.fillColor('#000000');

        doc.fontSize(10);
        doc.font('Helvetica-Bold').text(`Habitación: `, 50, 115, { continued: true });
        doc.font('Helvetica').text(datos.noHabitacion);

        doc.font('Helvetica-Bold').text(`Fecha / Hora: `, 50, 130, { continued: true });
        doc.font('Helvetica').text(`${datos.fecha} ${datos.hora}`);

        doc.font('Helvetica-Bold').text(`Supervisor: `, 50, 145, { continued: true });
        doc.font('Helvetica').text(datos.supervisorNombre);

        doc.font('Helvetica-Bold').text(`Resultado: `, 50, 160, { continued: true });
        doc.font('Helvetica').text(datos.resultado);

        // Tabla de los 8 puntos
        let y = 190;
        doc.rect(50, y, 495, 20).fill('#F1F5F9');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9);
        doc.text('#', 55, y + 5);
        doc.text('Punto de Control', 80, y + 5);
        doc.text('Conforme', 320, y + 5);
        doc.text('Observación', 400, y + 5);

        y += 22;
        doc.font('Helvetica').fontSize(9).fillColor('#000000');

        datos.puntos.forEach((p) => {
          doc.rect(50, y, 495, 20).stroke('#E2E8F0');
          doc.text(`${p.numero}`, 55, y + 5);
          doc.text(p.descripcion, 80, y + 5, { width: 230 });
          doc.fillColor(p.cumple ? '#16A34A' : '#DC2626').text(p.cumple ? 'SÍ' : 'NO', 325, y + 5);
          doc.fillColor('#000000').text(p.observacion || '-', 400, y + 5, { width: 140 });
          y += 22;
        });

        if (datos.hayDanio) {
          y += 15;
          doc.fillColor('#DC2626').font('Helvetica-Bold').fontSize(10);
          doc.text(`ATENCIÓN: Daños registrados: ${datos.descripcionDanio || 'Avería física'}`, 50, y);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
