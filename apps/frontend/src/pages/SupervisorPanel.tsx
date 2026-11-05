import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Sparkles,
  ShieldAlert,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
  Clock,
  UserPlus,
} from 'lucide-react';
import {
  apiObtenerHabitaciones,
  apiObtenerPersonalActivoEnTurno,
  apiCrearAsignacionLimpieza,
  apiObtenerHabitacionesPorInspeccionar,
  apiObtenerHabitacionesBloqueadas,
  apiRegistrarInspeccion,
  apiConfirmarReparacion,
  apiDispararReporteInicialManual,
} from '../api/servicios';
import { InstruccionFR0801 } from '../components/instruccion-fr0801/InstruccionFR0801';
import { BadgeEstado } from '../components/common/BadgeEstado';
import { Modal } from '../components/common/Modal';
import {
  PUNTOS_INSPECCION_FR08_02,
  EstadoHabitacionInterno,
  RolEmpleado,
} from '@hospedaje/shared';

export const SupervisorPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [tabActiva, setTabActiva] = useState<'asignar' | 'inspeccionar' | 'bloqueadas' | 'turno'>('asignar');

  // Estados para formulario de asignación
  const [habitacionAsignarId, setHabitacionAsignarId] = useState('');
  const [camaristaId, setCamaristaId] = useState('');
  const [auxiliarId, setAuxiliarId] = useState('');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);

  // Estados para formulario de inspección FR08-02
  const [habitacionInspeccionar, setHabitacionInspeccionar] = useState<any | null>(null);
  const [puntosInspeccion, setPuntosInspeccion] = useState<
    Array<{ numero: number; descripcion: string; cumple: boolean; observacion: string }>
  >(
    PUNTOS_INSPECCION_FR08_02.map((p) => ({
      numero: p.numero,
      descripcion: p.descripcion,
      cumple: true,
      observacion: '',
    })),
  );
  const [hayDanio, setHayDanio] = useState(false);
  const [descripcionDanio, setDescripcionDanio] = useState('');

  // 1. Consultas
  const { data: habitacionesSucias = [] } = useQuery({
    queryKey: ['habitacionesSucias'],
    queryFn: () => apiObtenerHabitaciones(undefined, EstadoHabitacionInterno.VACANTE_SUCIA),
  });

  const { data: personalActivo = [] } = useQuery({
    queryKey: ['personalActivo'],
    queryFn: apiObtenerPersonalActivoEnTurno,
  });

  const { data: habitacionesPorInspeccionar = [] } = useQuery({
    queryKey: ['habitacionesPorInspeccionar'],
    queryFn: apiObtenerHabitacionesPorInspeccionar,
  });

  const { data: habitacionesBloqueadas = [] } = useQuery({
    queryKey: ['habitacionesBloqueadas'],
    queryFn: apiObtenerHabitacionesBloqueadas,
  });

  // 2. Mutaciones
  const mutacionAsignar = useMutation({
    mutationFn: apiCrearAsignacionLimpieza,
    onSuccess: () => {
      setMensajeExito('Limpieza asignada exitosamente al personal del turno.');
      setErrorAsignacion(null);
      setHabitacionAsignarId('');
      setCamaristaId('');
      setAuxiliarId('');
      queryClient.invalidateQueries({ queryKey: ['habitacionesSucias'] });
      queryClient.invalidateQueries({ queryKey: ['habitaciones'] });
      queryClient.invalidateQueries({ queryKey: ['contadores'] });
      setTimeout(() => setMensajeExito(null), 4000);
    },
    onError: (err: any) => {
      setErrorAsignacion(err.message || 'Error al asignar la limpieza.');
    },
  });

  const mutacionInspeccion = useMutation({
    mutationFn: apiRegistrarInspeccion,
    onSuccess: (data: any) => {
      setHabitacionInspeccionar(null);
      queryClient.invalidateQueries({ queryKey: ['habitacionesPorInspeccionar'] });
      queryClient.invalidateQueries({ queryKey: ['habitacionesBloqueadas'] });
      queryClient.invalidateQueries({ queryKey: ['habitaciones'] });
      queryClient.invalidateQueries({ queryKey: ['contadores'] });
      queryClient.invalidateQueries({ queryKey: ['reportes'] });

      let msg = 'Inspección procesada exitosamente.';
      if (data.resultado === 'APROBADA') {
        msg = 'Inspección APROBADA: Habitación liberada como DISPONIBLE a Reservaciones.';
      } else if (data.resultado === 'DANIO') {
        msg = 'Inspección con DAÑOS: Habitación BLOQUEADA y reporte técnico registrado.';
      } else {
        msg = 'Inspección NO CONFORME: Tarea de corrección asignada a la camarista.';
      }
      setMensajeExito(msg);
      setTimeout(() => setMensajeExito(null), 6000);
    },
    onError: (err: any) => {
      alert(`Error en inspección: ${err.message}`);
    },
  });

  const mutacionConfirmarReparacion = useMutation({
    mutationFn: ({ id, observaciones }: { id: string; observaciones?: string }) =>
      apiConfirmarReparacion(id, observaciones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitacionesBloqueadas'] });
      queryClient.invalidateQueries({ queryKey: ['habitacionesSucias'] });
      queryClient.invalidateQueries({ queryKey: ['habitaciones'] });
      queryClient.invalidateQueries({ queryKey: ['contadores'] });
      setMensajeExito('Reparación confirmada: Habitación devuelta a VACANTE_SUCIA para nueva limpieza.');
      setTimeout(() => setMensajeExito(null), 5000);
    },
  });

  const mutacionReporteInicial = useMutation({
    mutationFn: apiDispararReporteInicialManual,
    onSuccess: (data: any) => {
      setMensajeExito(
        `Reporte Inicial ${data.reporte.noReporte} emitido y enviado a Reservaciones (${data.habitaciones.length} habitaciones).`,
      );
      queryClient.invalidateQueries({ queryKey: ['reportes'] });
      setTimeout(() => setMensajeExito(null), 6000);
    },
  });

  const camaristasActivas = personalActivo.filter((p: any) => p.rol === RolEmpleado.CAMARISTA);
  const auxiliaresActivos = personalActivo.filter((p: any) => p.rol === RolEmpleado.AUXILIAR);

  const handleAbrirInspeccion = (hab: any) => {
    setHabitacionInspeccionar(hab);
    setPuntosInspeccion(
      PUNTOS_INSPECCION_FR08_02.map((p) => ({
        numero: p.numero,
        descripcion: p.descripcion,
        cumple: true,
        observacion: '',
      })),
    );
    setHayDanio(false);
    setDescripcionDanio('');
  };

  const handleEnviarInspeccion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitacionInspeccionar) return;

    mutacionInspeccion.mutate({
      habitacionId: habitacionInspeccionar.id,
      puntos: puntosInspeccion,
      hayDanio,
      descripcionDanio: hayDanio ? descripcionDanio : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Panel de Supervisor de Housekeeping
        </h2>
        <p className="text-sm text-slate-500">
          Asignación operativa de limpiezas, inspecciones bajo estándar FR08-02 y control de reparaciones.
        </p>
      </div>

      {mensajeExito && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {mensajeExito}
        </div>
      )}

      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setTabActiva('asignar')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tabActiva === 'asignar'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Asignar Limpieza ({habitacionesSucias.length})
        </button>

        <button
          onClick={() => setTabActiva('inspeccionar')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tabActiva === 'inspeccionar'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          Por Inspeccionar ({habitacionesPorInspeccionar.length})
        </button>

        <button
          onClick={() => setTabActiva('bloqueadas')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tabActiva === 'bloqueadas'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Bloqueadas por Daño ({habitacionesBloqueadas.length})
        </button>

        <button
          onClick={() => setTabActiva('turno')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tabActiva === 'turno'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          Reporte Inicial de Turno
        </button>
      </div>

      {/* PESTAÑA 1: ASIGNAR LIMPIEZA */}
      {tabActiva === 'asignar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Nueva Asignación de Limpieza
            </h3>

            {errorAsignacion && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                {errorAsignacion}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutacionAsignar.mutate({
                  habitacionId: habitacionAsignarId,
                  camaristaId,
                  auxiliarId,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Habitación en Vacante Sucia
                </label>
                <select
                  required
                  value={habitacionAsignarId}
                  onChange={(e) => setHabitacionAsignarId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="">-- Seleccione una habitación pendiente --</option>
                  {habitacionesSucias.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      Habitación {h.noHabitacion} ({h.tipo} - Piso {h.piso})
                    </option>
                  ))}
                </select>
                {habitacionesSucias.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">No hay habitaciones pendientes en VACANTE_SUCIA.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Camarista Activa en Turno
                  </label>
                  <select
                    required
                    value={camaristaId}
                    onChange={(e) => setCamaristaId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">-- Seleccionar Camarista --</option>
                    {camaristasActivas.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Auxiliar Activo en Turno
                  </label>
                  <select
                    required
                    value={auxiliarId}
                    onChange={(e) => setAuxiliarId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">-- Seleccionar Auxiliar --</option>
                    {auxiliaresActivos.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={mutacionAsignar.isPending || !habitacionAsignarId}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-700 text-white font-semibold rounded-xl hover:bg-blue-800 transition disabled:opacity-50"
                >
                  {mutacionAsignar.isPending ? 'Asignando...' : 'Confirmar Asignación'}
                </button>
              </div>
            </form>
          </div>

          {/* Panel Lateral FR08-01 */}
          <div className="lg:col-span-1">
            <InstruccionFR0801 />
          </div>
        </div>
      )}

      {/* PESTAÑA 2: POR INSPECCIONAR */}
      {tabActiva === 'inspeccionar' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Bandeja de Inspección FR08-02
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Habitaciones reportadas como limpias que requieren verificación obligatoria antes de ser liberadas a Reservaciones.
            </p>

            {habitacionesPorInspeccionar.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>No hay habitaciones pendientes por inspeccionar en este momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {habitacionesPorInspeccionar.map((hab: any) => (
                  <div
                    key={hab.id}
                    className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-2xl font-black text-slate-900">{hab.noHabitacion}</span>
                        <span className="block text-xs font-semibold text-slate-500">
                          {hab.tipo} — Piso {hab.piso}
                        </span>
                      </div>
                      <BadgeEstado estado={hab.estado} size="sm" />
                    </div>

                    {hab.asignaciones?.[0] && (
                      <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                        <span>
                          Camarista: <strong>{hab.asignaciones[0].camarista?.nombre}</strong>
                        </span>
                        <br />
                        <span>
                          Auxiliar: <strong>{hab.asignaciones[0].auxiliar?.nombre}</strong>
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => handleAbrirInspeccion(hab)}
                      className="w-full py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-1.5"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      Realizar Inspección FR08-02
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: HABITACIONES BLOQUEADAS */}
      {tabActiva === 'bloqueadas' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Habitaciones Bloqueadas por Daño o Falla
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Habitaciones retiradas de venta por averías técnicas. Una vez solucionadas por mantenimiento, el Supervisor confirma la reparación para retornarlas a limpieza.
          </p>

          {habitacionesBloqueadas.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
              <p>Excelente: No hay ninguna habitación bloqueada por averías actualmente.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {habitacionesBloqueadas.map((hab: any) => {
                const reparacion = hab.reparaciones?.[0];
                return (
                  <div key={hab.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-slate-900">Habitación {hab.noHabitacion}</span>
                        <BadgeEstado estado={hab.estado} size="sm" />
                      </div>
                      <p className="text-xs text-red-700 font-medium bg-red-50 p-2 rounded-lg border border-red-100 max-w-xl">
                        <strong>Motivo de bloqueo:</strong>{' '}
                        {reparacion?.descripcion || 'Avería registrada durante inspección.'}
                      </p>
                    </div>

                    {reparacion && (
                      <button
                        onClick={() =>
                          mutacionConfirmarReparacion.mutate({
                            id: reparacion.id,
                            observaciones: 'Reparación verificada por el supervisor.',
                          })
                        }
                        disabled={mutacionConfirmarReparacion.isPending}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
                      >
                        <Wrench className="w-4 h-4" />
                        Confirmar Reparación (Retornar a Sucia)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: REPORTE INICIAL MANUAL */}
      {tabActiva === 'turno' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" />
            Envío Manual del Reporte Inicial de Turno (SCH-1)
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Aunque el cron ejecuta automáticamente la apertura del turno a las 07:00 AM (`America/Hermosillo`), el Supervisor puede detonar manualmente el reporte inicial en cualquier momento si se requiere forzar la sincronización completa del estado de las habitaciones hacia Reservaciones.
          </p>

          <button
            onClick={() => mutacionReporteInicial.mutate()}
            disabled={mutacionReporteInicial.isPending}
            className="px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {mutacionReporteInicial.isPending ? 'Generando y enviando...' : 'Generar y Enviar Reporte Inicial Ahora'}
          </button>
        </div>
      )}

      {/* Modal Digital FR08-02: Lista de Chequeo de Inspección */}
      <Modal
        isOpen={!!habitacionInspeccionar}
        onClose={() => setHabitacionInspeccionar(null)}
        title={`Inspección FR08-02 — Habitación ${habitacionInspeccionar?.noHabitacion}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleEnviarInspeccion} className="space-y-5">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between">
            <span>
              Tipo: <strong>{habitacionInspeccionar?.tipo}</strong>
            </span>
            <span>
              Piso: <strong>Piso {habitacionInspeccionar?.piso}</strong>
            </span>
            <span>
              Estado: <strong className="text-sky-700">VACANTE_LIMPIA</strong>
            </span>
          </div>

          {/* Los 8 puntos de control */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Evaluación de los 8 Puntos de Control Normativos
            </h4>

            {puntosInspeccion.map((punto, index) => (
              <div
                key={punto.numero}
                className="p-3 border border-slate-200 rounded-lg text-xs space-y-2 bg-white"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {punto.numero}. {punto.descripcion}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const copia = [...puntosInspeccion];
                        copia[index].cumple = true;
                        setPuntosInspeccion(copia);
                      }}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        punto.cumple ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const copia = [...puntosInspeccion];
                        copia[index].cumple = false;
                        setPuntosInspeccion(copia);
                      }}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        !punto.cumple ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {!punto.cumple && (
                  <input
                    type="text"
                    required
                    placeholder="Escriba la observación o detalle a corregir..."
                    value={punto.observacion}
                    onChange={(e) => {
                      const copia = [...puntosInspeccion];
                      copia[index].observacion = e.target.value;
                      setPuntosInspeccion(copia);
                    }}
                    className="w-full p-2 border border-red-300 rounded text-xs focus:outline-none focus:border-red-600"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Sección de Daños o Averías */}
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hayDanio}
                onChange={(e) => setHayDanio(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <span className="text-xs font-bold uppercase text-slate-900">
                ¿Se detectaron daños físicos, roturas o fallas de equipamiento?
              </span>
            </label>

            {hayDanio && (
              <div>
                <label className="block text-[11px] font-bold uppercase text-red-700 mb-1">
                  Descripción obligatoria del daño (motivo del bloqueo):
                </label>
                <textarea
                  required
                  rows={2}
                  value={descripcionDanio}
                  onChange={(e) => setDescripcionDanio(e.target.value)}
                  placeholder="Ej: Fuga persistente en lavamanos, rotura de lámpara de noche..."
                  className="w-full p-2.5 border border-red-300 rounded-lg text-xs focus:outline-none focus:border-red-600"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setHabitacionInspeccionar(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutacionInspeccion.isPending}
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {mutacionInspeccion.isPending ? 'Guardando...' : 'Finalizar y Registrar Evaluación'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
