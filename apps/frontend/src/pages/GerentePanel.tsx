import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Users,
  FileText,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  PieChart,
} from 'lucide-react';
import {
  apiObtenerOcupacion,
  apiObtenerHistorialReportes,
  apiObtenerEmpleados,
  apiCrearEmpleado,
  apiObtenerTurnos,
  obtenerUrlDescargaPdf,
} from '../api/servicios';
import { Modal } from '../components/common/Modal';
import { RolEmpleado } from '@hospedaje/shared';

export const GerentePanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [seccion, setSeccion] = useState<'reportes' | 'personal'>('reportes');

  // Filtros de reportes FR08-03
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

  // Modal crear empleado
  const [modalEmpleadoAbierto, setModalEmpleadoAbierto] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [emailNuevo, setEmailNuevo] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [rolNuevo, setRolNuevo] = useState<RolEmpleado>(RolEmpleado.CAMARISTA);
  const [errorCrearEmpleado, setErrorCrearEmpleado] = useState<string | null>(null);

  // 1. Consultas
  const { data: ocupacion, isLoading: loadingOcupacion } = useQuery({
    queryKey: ['ocupacion'],
    queryFn: apiObtenerOcupacion,
    refetchInterval: 15000,
  });

  const { data: reportes = [], isLoading: loadingReportes } = useQuery({
    queryKey: ['historialReportes', fechaInicio, fechaFin, estadoFiltro],
    queryFn: () =>
      apiObtenerHistorialReportes({
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
        estadoExterno: estadoFiltro || undefined,
      }),
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => apiObtenerEmpleados(),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: apiObtenerTurnos,
  });

  // Mutación crear empleado
  const mutacionCrearEmpleado = useMutation({
    mutationFn: apiCrearEmpleado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      setModalEmpleadoAbierto(false);
      setNombreNuevo('');
      setEmailNuevo('');
      setPasswordNuevo('');
      setErrorCrearEmpleado(null);
    },
    onError: (err: any) => {
      setErrorCrearEmpleado(err.message || 'Error al registrar colaborador.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Panel de Gerencia de Hospedaje
        </h2>
        <p className="text-sm text-slate-500">
          Supervisión ejecutiva, métricas de ocupación, auditoría de reportes oficiales FR08-03 y administración del talento.
        </p>
      </div>

      {/* Tarjetas de Métricas de Ocupación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            % Ocupación General
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-blue-900">
              {ocupacion?.porcentajeOcupacion ?? 0}%
            </span>
            <span className="text-xs font-semibold text-slate-500">del inventario</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${ocupacion?.porcentajeOcupacion || 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Habitaciones
          </span>
          <p className="text-3xl font-black text-slate-900 mt-2">
            {ocupacion?.totalHabitaciones ?? 0}
          </p>
          <span className="text-xs text-slate-500">Inventario registrado</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Disponibles (Venta)
          </span>
          <p className="text-3xl font-black text-emerald-800 mt-2">
            {ocupacion?.disponibles ?? 0}
          </p>
          <span className="text-xs text-slate-500">Listas para check-in</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
            No Vendibles / Ocupadas
          </span>
          <p className="text-3xl font-black text-purple-900 mt-2">
            {ocupacion?.ocupadas ?? 0}
          </p>
          <span className="text-xs text-slate-500">Con huésped o en limpieza</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600">
            Bloqueadas por Daño
          </span>
          <p className="text-3xl font-black text-red-900 mt-2">
            {ocupacion?.bloqueadas ?? 0}
          </p>
          <span className="text-xs text-slate-500">En mantenimiento</span>
        </div>
      </div>

      {/* Selector de Sección */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setSeccion('reportes')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            seccion === 'reportes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Historial de Reportes FR08-03 ({reportes.length})
        </button>

        <button
          onClick={() => setSeccion('personal')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            seccion === 'personal'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Personal y Turnos ({empleados.length})
        </button>
      </div>

      {/* SECCIÓN 1: REPORTES FR08-03 */}
      {seccion === 'reportes' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Auditoría de Reportes de Estado FR08-03
              </h3>
              <p className="text-xs text-slate-500">
                Registros consecutivos anuales generados con firma digital del supervisor y descargables en PDF.
              </p>
            </div>
          </div>

          {/* Filtros de Fecha y Estado */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Estado Reservaciones</label>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="">-- Todos los estados --</option>
                <option value="DISPONIBLE">DISPONIBLE</option>
                <option value="BLOQUEADA">BLOQUEADA</option>
                <option value="OCUPADA">OCUPADA</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setFechaInicio('');
                  setFechaFin('');
                  setEstadoFiltro('');
                }}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>

          {/* Tabla de Reportes */}
          {loadingReportes ? (
            <div className="text-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Cargando reportes oficiales...</p>
            </div>
          ) : reportes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No se encontraron reportes con los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">No. Reporte</th>
                    <th className="py-3 px-4">Habitación</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Estado Ext.</th>
                    <th className="py-3 px-4">Supervisor</th>
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4 text-right">Descarga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportes.map((rep: any) => (
                    <tr key={rep.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">
                        {rep.noReporte}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {rep.habitacion ? rep.habitacion.noHabitacion : 'General'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {rep.tipo}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            rep.estadoExterno === 'DISPONIBLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rep.estadoExterno === 'BLOQUEADA'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {rep.estadoExterno}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {rep.supervisor?.nombre || 'Supervisor'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(rep.fechaHora).toLocaleString('es-MX', {
                          timeZone: 'America/Hermosillo',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={obtenerUrlDescargaPdf(rep.noReporte)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: PERSONAL Y TURNOS */}
      {seccion === 'personal' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Colaboradores de Housekeeping</h3>
                <p className="text-xs text-slate-500">Catálogo de empleados y roles del área.</p>
              </div>

              <button
                onClick={() => setModalEmpleadoAbierto(true)}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Registrar Empleado
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {empleados.map((emp: any) => (
                <div
                  key={emp.id}
                  className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-1"
                >
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    {emp.rol}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{emp.nombre}</h4>
                  <p className="text-xs text-slate-500 truncate">{emp.email}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Historial de Turnos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Programación de Turnos Operativos
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              {turnos.map((t: any) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">
                      {new Date(t.fecha).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo' })}
                    </span>
                    <span className="text-slate-500 ml-2">
                      Horario: {t.horaInicio} - {t.horaFin}
                    </span>
                  </div>
                  <span className="text-slate-600 font-medium">
                    {t.empleados?.length || 0} Colaboradores asignados
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Nuevo Empleado */}
      <Modal
        isOpen={modalEmpleadoAbierto}
        onClose={() => setModalEmpleadoAbierto(false)}
        title="Registrar Nuevo Colaborador"
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutacionCrearEmpleado.mutate({
              nombre: nombreNuevo,
              email: emailNuevo,
              password: passwordNuevo,
              rol: rolNuevo,
            });
          }}
          className="space-y-4 text-xs"
        >
          {errorCrearEmpleado && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {errorCrearEmpleado}
            </div>
          )}

          <div>
            <label className="block font-bold uppercase text-slate-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              required
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="Ej: Rosa Morales"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={emailNuevo}
              onChange={(e) => setEmailNuevo(e.target.value)}
              placeholder="rosa@resort.com"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={passwordNuevo}
              onChange={(e) => setPasswordNuevo(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-700 mb-1">Rol</label>
            <select
              value={rolNuevo}
              onChange={(e) => setRolNuevo(e.target.value as RolEmpleado)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value={RolEmpleado.CAMARISTA}>Camarista</option>
              <option value={RolEmpleado.AUXILIAR}>Auxiliar de Habitaciones</option>
              <option value={RolEmpleado.SUPERVISOR}>Supervisor de Housekeeping</option>
              <option value={RolEmpleado.GERENTE}>Gerente de Hospedaje</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalEmpleadoAbierto(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutacionCrearEmpleado.isPending}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm"
            >
              {mutacionCrearEmpleado.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
