import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TableroHabitaciones } from '../src/pages/TableroHabitaciones';
import { EstadoHabitacionInterno } from '@hospedaje/shared';

// Mock de API
vi.mock('../src/api/servicios', () => ({
  apiObtenerHabitaciones: vi.fn().mockResolvedValue([
    { id: 'h1', noHabitacion: '101', tipo: 'SENCILLA', piso: 1, estado: 'OCUPADA' },
    { id: 'h2', noHabitacion: '102', tipo: 'SENCILLA', piso: 1, estado: 'VACANTE_SUCIA' },
    { id: 'h3', noHabitacion: '201', tipo: 'SUITE', piso: 2, estado: 'VACANTE_INSPECCIONADA' },
  ]),
  apiObtenerContadores: vi.fn().mockResolvedValue({
    total: 3,
    porEstado: {
      [EstadoHabitacionInterno.OCUPADA]: 1,
      [EstadoHabitacionInterno.VACANTE_SUCIA]: 1,
      [EstadoHabitacionInterno.VACANTE_INSPECCIONADA]: 1,
    },
  }),
  apiObtenerDetalleHabitacion: vi.fn(),
}));

describe('Pruebas Frontend — TableroHabitaciones', () => {
  it('renderiza el título del tablero y los contadores principales', async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <TableroHabitaciones />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Tablero de Control de Habitaciones')).toBeInTheDocument();
    expect(screen.getByText('Filtros:')).toBeInTheDocument();
  });
});
