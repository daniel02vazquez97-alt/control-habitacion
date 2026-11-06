import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  CheckSquare,
  BarChart3,
  Network,
  LogOut,
  Menu,
  X,
  Hotel,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RolEmpleado } from '@control-habitacion/shared';

export const Navbar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-800 text-white shadow-sm'
        : 'text-blue-100 hover:bg-blue-800/60 hover:text-white'
    }`;

  const mobileNavItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
      isActive
        ? 'bg-blue-800 text-white shadow-sm'
        : 'text-blue-100 hover:bg-blue-800/60 hover:text-white'
    }`;

  return (
    <nav className="bg-blue-900 border-b border-blue-950 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y título institucional */}
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg text-blue-900 shadow-sm">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-blue-200">
                Control de Habitación
              </span>
              <h1 className="text-base font-bold leading-none tracking-tight">
                FR08 Control de Habitaciones
              </h1>
            </div>
          </div>

          {/* Menú Desktop */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/tablero" className={navItemClass}>
              <LayoutDashboard className="w-4 h-4" />
              Tablero
            </NavLink>

            {hasRole(RolEmpleado.SUPERVISOR, RolEmpleado.GERENTE) && (
              <NavLink to="/supervisor" className={navItemClass}>
                <ClipboardCheck className="w-4 h-4" />
                Supervisor
              </NavLink>
            )}

            {hasRole(RolEmpleado.CAMARISTA, RolEmpleado.AUXILIAR) && (
              <NavLink to="/mis-tareas" className={navItemClass}>
                <CheckSquare className="w-4 h-4" />
                Mis Tareas
              </NavLink>
            )}

            {hasRole(RolEmpleado.GERENTE, RolEmpleado.SUPERVISOR) && (
              <NavLink to="/gerente" className={navItemClass}>
                <BarChart3 className="w-4 h-4" />
                Gerencia
              </NavLink>
            )}

            <NavLink to="/integraciones" className={navItemClass}>
              <Network className="w-4 h-4" />
              Integraciones
            </NavLink>
          </div>

          {/* Usuario y Logout */}
          <div className="hidden md:flex items-center gap-4">
            {user && (
              <div className="text-right">
                <p className="text-xs font-semibold leading-tight">{user.nombre}</p>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-800 text-blue-200 mt-0.5">
                  {user.rol}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Botón Móvil */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Desplegable Móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-blue-800 bg-blue-900 px-4 pt-3 pb-5 space-y-2">
          {user && (
            <div className="px-3 py-2 bg-blue-950/60 rounded-lg mb-3">
              <p className="text-sm font-semibold">{user.nombre}</p>
              <span className="text-xs font-medium text-blue-300">Rol: {user.rol}</span>
            </div>
          )}

          <NavLink
            to="/tablero"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavItemClass}
          >
            <LayoutDashboard className="w-5 h-5" />
            Tablero General
          </NavLink>

          {hasRole(RolEmpleado.SUPERVISOR, RolEmpleado.GERENTE) && (
            <NavLink
              to="/supervisor"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavItemClass}
            >
              <ClipboardCheck className="w-5 h-5" />
              Panel de Supervisor
            </NavLink>
          )}

          {hasRole(RolEmpleado.CAMARISTA, RolEmpleado.AUXILIAR) && (
            <NavLink
              to="/mis-tareas"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavItemClass}
            >
              <CheckSquare className="w-5 h-5" />
              Mis Tareas del Día
            </NavLink>
          )}

          {hasRole(RolEmpleado.GERENTE, RolEmpleado.SUPERVISOR) && (
            <NavLink
              to="/gerente"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavItemClass}
            >
              <BarChart3 className="w-5 h-5" />
              Reportes de Gerencia
            </NavLink>
          )}

          <NavLink
            to="/integraciones"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavItemClass}
          >
            <Network className="w-5 h-5" />
            Integraciones y Simulación
          </NavLink>

          <div className="pt-3 border-t border-blue-800">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-200 hover:bg-red-950/40 rounded-lg text-base font-medium"
            >
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
