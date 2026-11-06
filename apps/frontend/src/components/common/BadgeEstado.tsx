import React from 'react';
import { EstadoHabitacionInterno } from '@control-habitacion/shared';

interface Props {
  estado: EstadoHabitacionInterno | string;
  size?: 'sm' | 'md' | 'lg';
}

export const BadgeEstado: React.FC<Props> = ({ estado, size = 'md' }) => {
  const getEstilos = () => {
    switch (estado) {
      case EstadoHabitacionInterno.VACANTE_SUCIA:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case EstadoHabitacionInterno.VACANTE_LIMPIA:
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case EstadoHabitacionInterno.VACANTE_INSPECCIONADA:
      case 'DISPONIBLE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case EstadoHabitacionInterno.BLOQUEADA:
        return 'bg-red-100 text-red-800 border-red-300';
      case EstadoHabitacionInterno.OCUPADA:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getTextoLegible = () => {
    switch (estado) {
      case EstadoHabitacionInterno.VACANTE_SUCIA:
        return 'Vacante Sucia';
      case EstadoHabitacionInterno.VACANTE_LIMPIA:
        return 'Vacante Limpia';
      case EstadoHabitacionInterno.VACANTE_INSPECCIONADA:
        return 'Inspeccionada (Disponible)';
      case EstadoHabitacionInterno.BLOQUEADA:
        return 'Bloqueada por Daño';
      case EstadoHabitacionInterno.OCUPADA:
        return 'Ocupada';
      default:
        return estado;
    }
  };

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm font-semibold' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border shadow-sm ${padding} ${getEstilos()}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {getTextoLegible()}
    </span>
  );
};
