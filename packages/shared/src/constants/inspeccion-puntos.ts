/**
 * Definición oficial de los 8 puntos de inspección del formato FR08-02.
 */
export interface DefinicionPuntoInspeccion {
  numero: number;
  descripcion: string;
  categoria: string;
}

export const PUNTOS_INSPECCION_FR08_02: DefinicionPuntoInspeccion[] = [
  {
    numero: 1,
    descripcion: 'Cama tendida con ropa limpia',
    categoria: 'Cama y blancos',
  },
  {
    numero: 2,
    descripcion: 'Toallas limpias y completas',
    categoria: 'Blancos de baño',
  },
  {
    numero: 3,
    descripcion: 'Baño limpio y desinfectado',
    categoria: 'Higiene y sanitarios',
  },
  {
    numero: 4,
    descripcion: 'Pisos y alfombras limpios',
    categoria: 'Pisos y superficies',
  },
  {
    numero: 5,
    descripcion: 'Amenidades y suministros completos',
    categoria: 'Suministros',
  },
  {
    numero: 6,
    descripcion: 'Mobiliario en buen estado',
    categoria: 'Mobiliario',
  },
  {
    numero: 7,
    descripcion: 'Luces, A/C y TV funcionando',
    categoria: 'Equipamiento y servicios',
  },
  {
    numero: 8,
    descripcion: 'Sin objetos olvidados',
    categoria: 'Revisión final',
  },
];
