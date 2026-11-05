import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Network,
  Send,
  Inbox,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Code2,
  Key,
} from 'lucide-react';
import {
  apiObtenerMensajesIntegracion,
  apiReintentarMensajeIntegracion,
  apiSimularCheckOutRecepcion,
  apiSimularCheckInRecepcion,
  apiObtenerHabitaciones,
} from '../api/servicios';
import { EstadoHabitacionInterno } from '@hospedaje/shared';

export const IntegracionesPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false';

  const [direccionFiltro, setDireccionFiltro] = useState<string>('');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorSimulador, setErrorSimulador] = useState<string | null>(null);
  const [jsonExpandido, setJsonExpandido] = useState<string | null>(null);

  // Estados Simulador Check-out (REC-HOSP-1)
  const [habCheckOut, setHabCheckOut] = useState('');
  const [obsCheckOut, setObsCheckOut] = useState('Salida sin consumos extras');

  // Estados Simulador Check-in (REC-HOSP-2)
  const [habCheckIn, setHabCheckIn] = useState('');
  const [huespedCheckIn, setHuespedCheckIn] = useState('Alejandro Valenzuela');
  const [fechaEntrada, setFechaEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [fechaSalida, setFechaSalida] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  // 1. Consultas
  const { data: mensajes = [], isLoading: loadingMensajes, refetch } = useQuery({
    queryKey: ['mensajesIntegracion', direccionFiltro],
    queryFn: () => apiObtenerMensajesIntegracion(direccionFiltro || undefined),
    refetchInterval: 6000,
  });

  const { data: habitaciones = [] } = useQuery({
    queryKey: ['habitaciones'],
    queryFn: () => apiObtenerHabitaciones(),
  });

  const habitacionesOcupadas = habitaciones.filter((h: any) => h.estado === EstadoHabitacionInterno.OCUPADA);
  const habitacionesDisponibles = habitaciones.filter(
    (h: any) => h.estado === EstadoHabitacionInterno.VACANTE_INSPECCIONADA,
  );

  // 2. Mutaciones
  const mutacionCheckOut = useMutation({
    mutationFn: (dto: any) => apiSimularCheckOutRecepcion(dto),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['mensajesIntegracion'] });
      queryClient.invalidateQueries({ queryKey: ['habitaciones'] });
      queryClient.invalidateQueries({ queryKey: ['contadores'] });
      setMensajeExito(
        `Aviso REC-HOSP-1 recibido con 202 Accepted. Acuse: ${data.acuse.idMensaje} (${data.acuse.recibido}). La habitación pasó a VACANTE_SUCIA.`,
      );
      setErrorSimulador(null);
      setTimeout(() => setMensajeExito(null), 6000);
    },
    onError: (err: any) => {
      setErrorSimulador(`Error al simular check-out: ${err.message}`);
    },
  });

  const mutacionCheckIn = useMutation({
    mutationFn: (dto: any) => apiSimularCheckInRecepcion(dto),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['mensajesIntegracion'] });
      queryClient.invalidateQueries({ queryKey: ['habitaciones'] });
      queryClient.invalidateQueries({ queryKey: ['contadores'] });
      setMensajeExito(
        `Aviso REC-HOSP-2 recibido con 202 Accepted. Acuse: ${data.acuse.idMensaje} (${data.acuse.recibido}). La habitación pasó a OCUPADA.`,
      );
      setErrorSimulador(null);
      setTimeout(() => setMensajeExito(null), 6000);
    },
    onError: (err: any) => {
      setErrorSimulador(`Error al simular check-in: ${err.message}`);
    },
  });

  const mutacionReintentar = useMutation({
    mutationFn: (id: string) => apiReintentarMensajeIntegracion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensajesIntegracion'] });
      setMensajeExito('Reintento despachado exitosamente.');
      setTimeout(() => setMensajeExito(null), 4000);
    },
  });

  const handleSimularCheckOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habCheckOut) return;
    const idMensaje = crypto.randomUUID();
    mutacionCheckOut.mutate({
      idMensaje,
      noHabitacion: habCheckOut,
      fechaHoraSalida: new Date().toISOString(),
      observaciones: obsCheckOut,
    });
  };

  const handleSimularCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habCheckIn) return;
    const idMensaje = crypto.randomUUID();
    mutacionCheckIn.mutate({
      idMensaje,
      noHabitacion: habCheckIn,
      huesped: huespedCheckIn,
      fechaEntrada,
      fechaSalida,
    });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Integraciones y Servicios SOA
        </h2>
        <p className="text-sm text-slate-500">
          Supervisión de webhooks con Reservaciones y recepción de avisos de Recepción con idempotencia y firma digital.
        </p>
      </div>

      {mensajeExito && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {mensajeExito}
        </div>
      )}

      {errorSimulador && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          {errorSimulador}
        </div>
      )}

      {/* SIMULADOR DE RECEPCIÓN (Modo Demo) */}
      {demoMode && (
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Play className="w-6 h-6 text-emerald-400" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Herramienta de Demostración
                </span>
                <h3 className="text-lg font-bold">Simulador del Sistema de Recepción</h3>
              </div>
            </div>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 font-mono">
              VITE_DEMO_MODE=true
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Formulario Check-Out */}
            <form onSubmit={handleSimularCheckOut} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                1. Simular Aviso de Check-Out (REC-HOSP-1)
              </span>
              <p className="text-xs text-slate-300">
                Pasa la habitación automáticamente a <strong className="text-amber-300">VACANTE_SUCIA</strong> para iniciar el ciclo de limpieza.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Habitación Ocupada:
                </label>
                <select
                  required
                  value={habCheckOut}
                  onChange={(e) => setHabCheckOut(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                >
                  <option value="">-- Seleccionar habitación --</option>
                  {habitacionesOcupadas.map((h: any) => (
                    <option key={h.id} value={h.noHabitacion}>
                      Habitación {h.noHabitacion} ({h.tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Observaciones:</label>
                <input
                  type="text"
                  value={obsCheckOut}
                  onChange={(e) => setObsCheckOut(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={mutacionCheckOut.isPending || !habCheckOut}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                {mutacionCheckOut.isPending ? 'Enviando...' : 'Detonar Check-Out (REC-HOSP-1)'}
              </button>
            </form>

            {/* Formulario Check-In */}
            <form onSubmit={handleSimularCheckIn} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 block">
                2. Simular Aviso de Check-In (REC-HOSP-2)
              </span>
              <p className="text-xs text-slate-300">
                Pasa una habitación <strong className="text-emerald-300">VACANTE_INSPECCIONADA</strong> a <strong className="text-purple-300">OCUPADA</strong> y notifica a Reservaciones.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Habitación Disponible:
                </label>
                <select
                  required
                  value={habCheckIn}
                  onChange={(e) => setHabCheckIn(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                >
                  <option value="">-- Seleccionar habitación --</option>
                  {habitacionesDisponibles.map((h: any) => (
                    <option key={h.id} value={h.noHabitacion}>
                      Habitación {h.noHabitacion} ({h.tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre del Huésped:</label>
                <input
                  type="text"
                  required
                  value={huespedCheckIn}
                  onChange={(e) => setHuespedCheckIn(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={mutacionCheckIn.isPending || !habCheckIn}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                {mutacionCheckIn.isPending ? 'Enviando...' : 'Detonar Check-In (REC-HOSP-2)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BANDEJA DE MENSAJES DE INTEGRACIÓN (SCH-3) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">
              Bandeja de Integración (Entrantes y Salientes)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={direccionFiltro}
              onChange={(e) => setDireccionFiltro(e.target.value)}
              className="p-2 border border-slate-300 rounded-lg text-xs bg-slate-50"
            >
              <option value="">Todas las direcciones</option>
              <option value="ENTRANTE">Entrantes (Recepción)</option>
              <option value="SALIENTE">Salientes (Reservaciones)</option>
            </select>

            <button
              onClick={() => refetch()}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loadingMensajes ? (
          <div className="text-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Consultando mensajes...</p>
          </div>
        ) : mensajes.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p>No hay mensajes registrados en la bandeja todavía.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Interfaz</th>
                  <th className="py-3 px-4">Dirección</th>
                  <th className="py-3 px-4">UUID Mensaje</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Intentos</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mensajes.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-800">{m.interface}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.direccion === 'ENTRANTE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {m.direccion}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 truncate max-w-[150px]">
                      {m.idMensaje}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.estado === 'ENTREGADO' || m.estado === 'PROCESADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.estado === 'FALLIDO'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{m.intentos} / 5</td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(m.fechaHora).toLocaleString('es-MX', {
                        timeZone: 'America/Hermosillo',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() =>
                          setJsonExpandido(
                            jsonExpandido === m.id ? null : JSON.stringify(m.payload, null, 2),
                          )
                        }
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                        title="Ver payload JSON"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                      </button>

                      {m.direccion === 'SALIENTE' && m.estado !== 'PROCESADO' && (
                        <button
                          onClick={() => mutacionReintentar.mutate(m.id)}
                          className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded"
                          title="Reintentar despacho"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Visor de Payload JSON */}
        {jsonExpandido && (
          <div className="mt-4 p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto relative">
            <button
              onClick={() => setJsonExpandido(null)}
              className="absolute top-2 right-2 px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded text-[10px]"
            >
              Cerrar
            </button>
            <pre>{jsonExpandido}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
