import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hotel, KeyRound, Mail, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/tablero');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarUsuarioDemo = (correoDemo: string) => {
    setEmail(correoDemo);
    setPassword('DemoPass2026!');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/20 mb-4">
          <Hotel className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight sm:text-3xl">
          FR08 Control de Habitaciones
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Área de Hospedaje — Sistema de Control Operativo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@resort.com"
                  className="block w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <KeyRound className="h-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Accesos rápidos de prueba */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center flex items-center justify-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Acceso Rápido Demo (Roles)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => seleccionarUsuarioDemo('gerente@resort.com')}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <div className="font-semibold text-slate-900">Gerente</div>
                <div className="text-[11px] text-slate-500 truncate">gerente@resort.com</div>
              </button>

              <button
                type="button"
                onClick={() => seleccionarUsuarioDemo('supervisor@resort.com')}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <div className="font-semibold text-slate-900">Supervisor</div>
                <div className="text-[11px] text-slate-500 truncate">supervisor@resort.com</div>
              </button>

              <button
                type="button"
                onClick={() => seleccionarUsuarioDemo('camarista@resort.com')}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <div className="font-semibold text-slate-900">Camarista</div>
                <div className="text-[11px] text-slate-500 truncate">camarista@resort.com</div>
              </button>

              <button
                type="button"
                onClick={() => seleccionarUsuarioDemo('auxiliar@resort.com')}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <div className="font-semibold text-slate-900">Auxiliar</div>
                <div className="text-[11px] text-slate-500 truncate">auxiliar@resort.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
