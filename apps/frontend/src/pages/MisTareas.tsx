import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Sparkles,
  PackageCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  apiObtenerMisTareas,
  apiActualizarLimpiezaFisica,
  apiActualizarReposicionBlancos,
  apiReportarHabitacionLimpia,
} from '../api/servicios';
import { RolEmpleado } from '@hospedaje/shared';

export const MisTareas: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const esCamarista = user?.rol === RolEmpleado.CAMARISTA;
  const esAuxiliar = user?.rol === RolEmpleado.AUXILIAR;

  const {
    data: tareas = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['misTareas'],
    queryFn: apiObtenerMisTareas,
    refetchInterval: 7000,
  });

  const mutacionLimpieza = useMutation({
    mutationFn: ({ id, completada }: { id: string; completada: boolean }) =>
      apiActualizarLimpiezaFisica(id, completada),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['misTareas'] });
      setMensaje('Limpieza física actualizada correctamente.');
      setTimeout(() => setMensaje(null), 3000);
    },
  });

  const mutacionReposicion = useMutation({
    mutationFn: ({ id, completada }: { id: string; completada: boolean }) =>
      apiActualizarReposicionBlancos(id, completada),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['misTareas'] });
      setMensaje('Reposición de blancos actualizada correctamente.');
      setTimeout(() => setMensaje(null), 3000);
    },
  });

  const mutacionReportarLimpia = useMutation({
    mutationFn: (id: string) => apiReportarHabitacionLimpia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['misTareas'] });
      queryClient.invalidateQueries({ queryKey: ['habitaciones'] });
      setMensaje('¡Excelente! Habitación reportada como VACANTE_LIMPIA.');
      setTimeout(() => setMensaje(null), 4000);
    },
    onError: (err: any) => {
      alert(err.message || 'Error al reportar habitación limpia.');
    },
  });

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Encabezado Mobile-friendly */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {esCamarista ? 'Rol: Camarista' : esAuxiliar ? 'Rol: Auxiliar de Habitaciones' : user?.rol}
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mis Tareas del Día</h2>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 active:scale-95 transition"
        >
          <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {mensaje && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {mensaje}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Cargando tus tareas asignadas...</p>
        </div>
      ) : tareas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">¡Al día! No tienes tareas pendientes</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cuando el Supervisor asigne una nueva habitación a tu turno, aparecerá automáticamente en esta pantalla.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tareas.map((tarea: any) => {
            const hab = tarea.habitacion;
            const esCorreccion = tarea.tipo === 'CORRECCION';
            const ambasTerminadas = tarea.limpiezaTerminada && tarea.reposicionTerminada;

            return (
              <div
                key={tarea.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 space-y-4 transition ${
                  esCorreccion ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                }`}
              >
                {/* Cabecera de la Tarea */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                      Habitación {hab?.noHabitacion}
                    </span>
                    <span className="block text-xs font-semibold text-slate-500 uppercase mt-0.5">
                      {hab?.tipo} — Piso {hab?.piso}
                    </span>
                  </div>

                  {esCorreccion ? (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-300">
                      Corrección de Detalles
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-300">
                      Limpieza de Salida
                    </span>
                  )}
                </div>

                {/* Si es corrección, mostrar las observaciones del supervisor */}
                {tarea.detallesCorreccion && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-amber-800">
                      <AlertCircle className="w-4 h-4" />
                      Observaciones de Inspección para Corregir:
                    </span>
                    <p className="pl-5 font-medium">{tarea.detallesCorreccion}</p>
                  </div>
                )}

                {/* Estatus en paralelo de los dos colaboradores */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">
                      Limpieza (Camarista)
                    </span>
                    <p className="font-bold text-slate-800">{tarea.camarista?.nombre}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                        tarea.limpiezaTerminada ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {tarea.limpiezaTerminada ? '✓ Concluida' : '⏳ En progreso'}
                    </span>
                  </div>

                  <div className="space-y-1 border-l border-slate-200 pl-3">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">
                      Blancos (Auxiliar)
                    </span>
                    <p className="font-bold text-slate-800">{tarea.auxiliar?.nombre}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                        tarea.reposicionTerminada ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {tarea.reposicionTerminada ? '✓ Concluida' : '⏳ En progreso'}
                    </span>
                  </div>
                </div>

                {/* BOTONES GRANDES PARA OPERACIÓN TÁCTIL */}
                <div className="space-y-2 pt-2">
                  {/* Para Camarista: Terminar Limpieza */}
                  {esCamarista && (
                    <button
                      type="button"
                      onClick={() =>
                        mutacionLimpieza.mutate({
                          id: tarea.id,
                          completada: !tarea.limpiezaTerminada,
                        })
                      }
                      className={`w-full py-4 px-4 rounded-xl font-extrabold text-sm sm:text-base transition flex items-center justify-center gap-2 active:scale-98 shadow-sm ${
                        tarea.limpiezaTerminada
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                      }`}
                    >
                      <Sparkles className="w-5 h-5" />
                      {tarea.limpiezaTerminada
                        ? 'Limpieza Marcada como Concluida (Tocar para reabrir)'
                        : esCorreccion
                        ? 'Terminar Corrección de Detalles'
                        : 'Terminar Limpieza y Preparación'}
                    </button>
                  )}

                  {/* Para Auxiliar: Terminar Reposición de Blancos */}
                  {esAuxiliar && (
                    <button
                      type="button"
                      onClick={() =>
                        mutacionReposicion.mutate({
                          id: tarea.id,
                          completada: !tarea.reposicionTerminada,
                        })
                      }
                      className={`w-full py-4 px-4 rounded-xl font-extrabold text-sm sm:text-base transition flex items-center justify-center gap-2 active:scale-98 shadow-sm ${
                        tarea.reposicionTerminada
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                          : 'bg-sky-600 text-white hover:bg-sky-700 shadow-sky-600/20'
                      }`}
                    >
                      <PackageCheck className="w-5 h-5" />
                      {tarea.reposicionTerminada
                        ? 'Reposición Marcada como Concluida (Tocar para reabrir)'
                        : 'Terminar Reposición de Blancos y Suministros'}
                    </button>
                  )}

                  {/* Botón Final: Reportar Habitación Limpia (Solo Camarista cuando ambos terminaron) */}
                  {esCamarista && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => mutacionReportarLimpia.mutate(tarea.id)}
                        disabled={!ambasTerminadas || mutacionReportarLimpia.isPending}
                        className={`w-full py-4 px-4 rounded-xl font-black text-sm sm:text-base transition flex items-center justify-center gap-2 shadow-md ${
                          ambasTerminadas
                            ? 'bg-blue-700 text-white hover:bg-blue-800 active:scale-98 shadow-blue-700/25 ring-2 ring-blue-500'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Reportar Habitación Limpia (Avanzar a VACANTE_LIMPIA)
                      </button>

                      {!ambasTerminadas && (
                        <p className="text-[11px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5" />
                          Se habilitará cuando la limpieza y la reposición estén al 100%.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
