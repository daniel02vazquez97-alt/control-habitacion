import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Filter,
  RefreshCw,
  Clock,
  History,
  Building,
  CheckCircle2,
  AlertTriangle,
  User,
  Info,
} from 'lucide-react';
import {
  apiObtenerHabitaciones,
  apiObtenerContadores,
  apiObtenerDetalleHabitacion,
} from '../api/servicios';
import { BadgeEstado } from '../components/common/BadgeEstado';
import { Modal } from '../components/common/Modal';
import { EstadoHabitacionInterno } from '@control-habitacion/shared';

export const TableroHabitaciones: React.FC = () => {
  const [filtroPiso, setFiltroPiso] = useState<number | undefined>(undefined);
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>(undefined);
  const [habitacionSeleccionadaId, setHabitacionSeleccionadaId] = useState<string | null>(null);

  // Consulta de inventario de habitaciones
  const {
    data: habitaciones = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['habitaciones', filtroPiso, filtroEstado],
    queryFn: () => apiObtenerHabitaciones(filtroPiso, filtroEstado),
    refetchInterval: 10000, // Actualización automática cada 10 segundos
  });

  // Consulta de contadores
  const { data: contadoresData } = useQuery({
    queryKey: ['contadores'],
    queryFn: apiObtenerContadores,
    refetchInterval: 10000,
  });

  // Consulta de detalle y bitácora de la habitación seleccionada
  const { data: detalleHabitacion, isLoading: loadingDetalle } = useQuery({
    queryKey: ['habitacionDetalle', habitacionSeleccionadaId],
    queryFn: () => (habitacionSeleccionadaId ? apiObtenerDetalleHabitacion(habitacionSeleccionadaId) : null),
    enabled: !!habitacionSeleccionadaId,
  });

  const getCardBorder = (estado: string) => {
    switch (estado) {
      case EstadoHabitacionInterno.VACANTE_SUCIA:
        return 'border-l-4 border-l-amber-500 hover:border-amber-500';
      case EstadoHabitacionInterno.VACANTE_LIMPIA:
        return 'border-l-4 border-l-sky-500 hover:border-sky-500';
      case EstadoHabitacionInterno.VACANTE_INSPECCIONADA:
        return 'border-l-4 border-l-emerald-500 hover:border-emerald-500';
      case EstadoHabitacionInterno.BLOQUEADA:
        return 'border-l-4 border-l-red-500 hover:border-red-500';
      case EstadoHabitacionInterno.OCUPADA:
        return 'border-l-4 border-l-purple-500 hover:border-purple-500';
      default:
        return 'border-l-4 border-l-slate-300';
    }
  };

  const pisos = [1, 2];

  return (
    <div className="space-y-6">
      {/* Encabezado y controles de actualización */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Tablero de Control de Habitaciones
          </h2>
          <p className="text-sm text-slate-500">
            Supervisión operativa en tiempo real del estado de cada habitación del resort.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-blue-600' : ''}`} />
          {isRefetching ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Contadores por estado */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setFiltroEstado(undefined)}
          className={`cursor-pointer p-4 rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
            filtroEstado === undefined ? 'ring-2 ring-blue-600 border-blue-600' : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-slate-400">Total</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{contadoresData?.total || 0}</p>
        </div>

        <div
          onClick={() => setFiltroEstado(EstadoHabitacionInterno.VACANTE_SUCIA)}
          className={`cursor-pointer p-4 rounded-xl border bg-amber-50/50 shadow-sm transition hover:shadow-md ${
            filtroEstado === EstadoHabitacionInterno.VACANTE_SUCIA
              ? 'ring-2 ring-amber-500 border-amber-500'
              : 'border-amber-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-amber-700">Vacante Sucia</span>
          <p className="text-2xl font-black text-amber-900 mt-1">
            {contadoresData?.porEstado?.[EstadoHabitacionInterno.VACANTE_SUCIA] || 0}
          </p>
        </div>

        <div
          onClick={() => setFiltroEstado(EstadoHabitacionInterno.VACANTE_LIMPIA)}
          className={`cursor-pointer p-4 rounded-xl border bg-sky-50/50 shadow-sm transition hover:shadow-md ${
            filtroEstado === EstadoHabitacionInterno.VACANTE_LIMPIA
              ? 'ring-2 ring-sky-500 border-sky-500'
              : 'border-sky-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-sky-700">Vacante Limpia</span>
          <p className="text-2xl font-black text-sky-900 mt-1">
            {contadoresData?.porEstado?.[EstadoHabitacionInterno.VACANTE_LIMPIA] || 0}
          </p>
        </div>

        <div
          onClick={() => setFiltroEstado(EstadoHabitacionInterno.VACANTE_INSPECCIONADA)}
          className={`cursor-pointer p-4 rounded-xl border bg-emerald-50/50 shadow-sm transition hover:shadow-md ${
            filtroEstado === EstadoHabitacionInterno.VACANTE_INSPECCIONADA
              ? 'ring-2 ring-emerald-500 border-emerald-500'
              : 'border-emerald-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-emerald-700">Inspeccionada</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">
            {contadoresData?.porEstado?.[EstadoHabitacionInterno.VACANTE_INSPECCIONADA] || 0}
          </p>
        </div>

        <div
          onClick={() => setFiltroEstado(EstadoHabitacionInterno.BLOQUEADA)}
          className={`cursor-pointer p-4 rounded-xl border bg-red-50/50 shadow-sm transition hover:shadow-md ${
            filtroEstado === EstadoHabitacionInterno.BLOQUEADA
              ? 'ring-2 ring-red-500 border-red-500'
              : 'border-red-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-red-700">Bloqueada</span>
          <p className="text-2xl font-black text-red-900 mt-1">
            {contadoresData?.porEstado?.[EstadoHabitacionInterno.BLOQUEADA] || 0}
          </p>
        </div>

        <div
          onClick={() => setFiltroEstado(EstadoHabitacionInterno.OCUPADA)}
          className={`cursor-pointer p-4 rounded-xl border bg-purple-50/50 shadow-sm transition hover:shadow-md ${
            filtroEstado === EstadoHabitacionInterno.OCUPADA
              ? 'ring-2 ring-purple-500 border-purple-500'
              : 'border-purple-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase text-purple-700">Ocupada</span>
          <p className="text-2xl font-black text-purple-900 mt-1">
            {contadoresData?.porEstado?.[EstadoHabitacionInterno.OCUPADA] || 0}
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
          <Filter className="w-4 h-4 text-blue-600" />
          Filtros:
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-slate-500">Piso:</span>
          <button
            onClick={() => setFiltroPiso(undefined)}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filtroPiso === undefined ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroPiso(1)}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filtroPiso === 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Piso 1
          </button>
          <button
            onClick={() => setFiltroPiso(2)}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filtroPiso === 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Piso 2
          </button>
        </div>

        {filtroEstado && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500">Filtrando por estado:</span>
            <BadgeEstado estado={filtroEstado} size="sm" />
            <button
              onClick={() => setFiltroEstado(undefined)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Quitar filtro
            </button>
          </div>
        )}
      </div>

      {/* Cuadrícula de Habitaciones por Piso */}
      {isLoading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-slate-600 font-medium">Cargando habitaciones...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {pisos
            .filter((p) => filtroPiso === undefined || filtroPiso === p)
            .map((numPiso) => {
              const habitacionesPiso = habitaciones.filter((h: any) => h.piso === numPiso);
              if (habitacionesPiso.length === 0) return null;

              return (
                <div key={numPiso} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Building className="w-5 h-5 text-slate-500" />
                    <h3 className="text-lg font-bold text-slate-800">
                      Piso {numPiso} ({habitacionesPiso.length} Habitaciones)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {habitacionesPiso.map((hab: any) => (
                      <div
                        key={hab.id}
                        onClick={() => setHabitacionSeleccionadaId(hab.id)}
                        className={`cursor-pointer bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 ${getCardBorder(
                          hab.estado,
                        )}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xl font-black text-slate-900 tracking-tight">
                              {hab.noHabitacion}
                            </span>
                            <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                              {hab.tipo}
                            </span>
                          </div>
                          <Info className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                        </div>

                        <div className="mt-3">
                          <BadgeEstado estado={hab.estado} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Modal de Detalle y Bitácora Inmutable */}
      <Modal
        isOpen={!!habitacionSeleccionadaId}
        onClose={() => setHabitacionSeleccionadaId(null)}
        title={
          detalleHabitacion
            ? `Detalle y Bitácora — Habitación ${detalleHabitacion.noHabitacion}`
            : 'Cargando información...'
        }
        maxWidth="2xl"
      >
        {loadingDetalle || !detalleHabitacion ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Consultando historial en base de datos...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumen actual */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Habitación</span>
                <p className="font-bold text-slate-800 text-base">{detalleHabitacion.noHabitacion}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Tipo</span>
                <p className="font-semibold text-slate-700">{detalleHabitacion.tipo}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Piso</span>
                <p className="font-semibold text-slate-700">Piso {detalleHabitacion.piso}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Estado Actual</span>
                <div className="mt-0.5">
                  <BadgeEstado estado={detalleHabitacion.estado} size="sm" />
                </div>
              </div>
            </div>

            {/* Asignación o inspección en curso */}
            {detalleHabitacion.asignaciones?.[0] && (
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                <span className="font-bold uppercase tracking-wider block mb-1">
                  Asignación de Limpieza Activa
                </span>
                <p>
                  Camarista:{' '}
                  <strong>{detalleHabitacion.asignaciones[0].camarista?.nombre}</strong> (
                  {detalleHabitacion.asignaciones[0].limpiezaTerminada ? 'Limpia ✓' : 'Pendiente'}) |
                  Auxiliar:{' '}
                  <strong>{detalleHabitacion.asignaciones[0].auxiliar?.nombre}</strong> (
                  {detalleHabitacion.asignaciones[0].reposicionTerminada ? 'Suministrado ✓' : 'Pendiente'})
                </p>
              </div>
            )}

            {/* Bitácora inmutable de auditoría */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Bitácora Inmutable de Auditoría de Estados
                </h4>
              </div>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {detalleHabitacion.bitacoras?.map((b: any) => (
                  <div key={b.id} className="relative text-xs space-y-1">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {b.estadoAnterior} → <strong className="text-blue-700">{b.estadoNuevo}</strong>
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        {b.origen}
                      </span>
                    </div>

                    <div className="text-slate-500 flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(b.fechaHora).toLocaleString('es-MX', {
                          timeZone: 'America/Hermosillo',
                        })}
                      </span>
                      {b.usuario && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {b.usuario.nombre} ({b.usuario.rol})
                        </span>
                      )}
                    </div>

                    {b.nota && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 text-[11px]">
                        "{b.nota}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
