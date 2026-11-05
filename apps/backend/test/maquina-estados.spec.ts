import {
  EstadoHabitacionInterno,
  EstadoHabitacionExterno,
  esTransicionValida,
  obtenerEstadoExterno,
  PUNTOS_INSPECCION_FR08_02,
} from '@hospedaje/shared';
import { Sch2InventarioService } from '../src/modules/sch2-inventario/sch2-inventario.service';
import { ConflictException } from '@nestjs/common';
import { OrigenBitacora } from '@prisma/client';

describe('Pruebas Unitarias — Máquina de Estados y Reglas de Negocio FR08', () => {
  describe('Validación de la Máquina de Estados (Transiciones Permitidas)', () => {
    it('debe permitir OCUPADA -> VACANTE_SUCIA (Aviso check-out)', () => {
      expect(
        esTransicionValida(
          EstadoHabitacionInterno.OCUPADA,
          EstadoHabitacionInterno.VACANTE_SUCIA,
        ),
      ).toBe(true);
    });

    it('debe permitir VACANTE_SUCIA -> VACANTE_LIMPIA (Reportar limpia)', () => {
      expect(
        esTransicionValida(
          EstadoHabitacionInterno.VACANTE_SUCIA,
          EstadoHabitacionInterno.VACANTE_LIMPIA,
        ),
      ).toBe(true);
    });

    it('debe permitir VACANTE_LIMPIA -> VACANTE_INSPECCIONADA (Inspección aprobada)', () => {
      expect(
        esTransicionValida(
          EstadoHabitacionInterno.VACANTE_LIMPIA,
          EstadoHabitacionInterno.VACANTE_INSPECCIONADA,
        ),
      ).toBe(true);
    });

    it('debe permitir VACANTE_LIMPIA -> BLOQUEADA (Inspección con daño)', () => {
      expect(
        esTransicionValida(
          EstadoHabitacionInterno.VACANTE_LIMPIA,
          EstadoHabitacionInterno.BLOQUEADA,
        ),
      ).toBe(true);
    });

    it('debe permitir VACANTE_LIMPIA -> VACANTE_LIMPIA (Corrección y reinspección)', () => {
      expect(
        esTransicionValida(
          EstadoHabitacionInterno.VACANTE_LIMPIA,
          EstadoHabitacionInterno.VACANTE_LIMPIA,
        ),
      ).toBe(true);
    });

    it('debe permitir BLOQUEADA -> VACANTE_SUCIA (Reparación confirmada)', () => {
      expect(
        esTransicionValida(
          EstadoHabitacionInterno.BLOQUEADA,
          EstadoHabitacionInterno.VACANTE_SUCIA,
        ),
      ).toBe(true);
    });

    it('debe permitir VACANTE_INSPECCIONADA -> OCUPADA (Aviso check-in)', () => {
      expect(
        esTransicionValida(
          EstadoHabitacionInterno.VACANTE_INSPECCIONADA,
          EstadoHabitacionInterno.OCUPADA,
        ),
      ).toBe(true);
    });
  });

  describe('Rechazo de Transiciones Inválidas (Regla 75)', () => {
    it('debe rechazar VACANTE_SUCIA -> OCUPADA', () => {
      expect(
        esTransicionValida(
          EstadoHabitacionInterno.VACANTE_SUCIA,
          EstadoHabitacionInterno.OCUPADA,
        ),
      ).toBe(false);
    });

    it('debe rechazar VACANTE_SUCIA -> VACANTE_INSPECCIONADA sin limpiar', () => {
      expect(
        esTransicionValida(
          EstadoHabitacionInterno.VACANTE_SUCIA,
          EstadoHabitacionInterno.VACANTE_INSPECCIONADA,
        ),
      ).toBe(false);
    });

    it('debe rechazar BLOQUEADA -> VACANTE_INSPECCIONADA directamente', () => {
      expect(
        esTransicionValida(
          EstadoHabitacionInterno.BLOQUEADA,
          EstadoHabitacionInterno.VACANTE_INSPECCIONADA,
        ),
      ).toBe(false);
    });

    it('debe rechazar OCUPADA -> VACANTE_LIMPIA', () => {
      expect(
        esTransicionValida(
          EstadoHabitacionInterno.OCUPADA,
          EstadoHabitacionInterno.VACANTE_LIMPIA,
        ),
      ).toBe(false);
    });
  });

  describe('Mapeo de Estados Internos a Externos (Reservaciones)', () => {
    it('únicamente VACANTE_INSPECCIONADA mapea a DISPONIBLE', () => {
      expect(obtenerEstadoExterno(EstadoHabitacionInterno.VACANTE_INSPECCIONADA)).toBe(
        EstadoHabitacionExterno.DISPONIBLE,
      );
    });

    it('BLOQUEADA mapea a BLOQUEADA', () => {
      expect(obtenerEstadoExterno(EstadoHabitacionInterno.BLOQUEADA)).toBe(
        EstadoHabitacionExterno.BLOQUEADA,
      );
    });

    it('OCUPADA, VACANTE_SUCIA y VACANTE_LIMPIA mapean a OCUPADA (no vendibles)', () => {
      expect(obtenerEstadoExterno(EstadoHabitacionInterno.OCUPADA)).toBe(
        EstadoHabitacionExterno.OCUPADA,
      );
      expect(obtenerEstadoExterno(EstadoHabitacionInterno.VACANTE_SUCIA)).toBe(
        EstadoHabitacionExterno.OCUPADA,
      );
      expect(obtenerEstadoExterno(EstadoHabitacionInterno.VACANTE_LIMPIA)).toBe(
        EstadoHabitacionExterno.OCUPADA,
      );
    });
  });

  describe('Lista de Chequeo FR08-02', () => {
    it('debe contener exactamente 8 puntos de control normativos', () => {
      expect(PUNTOS_INSPECCION_FR08_02).toHaveLength(8);
      expect(PUNTOS_INSPECCION_FR08_02[0].descripcion).toContain('Cama tendida');
      expect(PUNTOS_INSPECCION_FR08_02[7].descripcion).toContain('Sin objetos olvidados');
    });
  });

  describe('Servicio de Inventario: Lanzamiento de HTTP 409 Conflict', () => {
    let service: Sch2InventarioService;
    let mockPrisma: any;
    let mockEmitter: any;

    beforeEach(() => {
      mockPrisma = {
        habitacion: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'hab-1',
            noHabitacion: '101',
            estado: EstadoHabitacionInterno.OCUPADA,
          }),
        },
        $transaction: jest.fn(),
      };
      mockEmitter = { emit: jest.fn() };
      service = new Sch2InventarioService(mockPrisma, mockEmitter);
    });

    it('debe arrojar ConflictException (409) al intentar una transición no permitida', async () => {
      await expect(
        service.cambiarEstado(
          'hab-1',
          EstadoHabitacionInterno.VACANTE_INSPECCIONADA as any,
          OrigenBitacora.USUARIO,
          'user-1',
          'Intento inválido',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
