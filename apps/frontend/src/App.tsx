import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { TableroHabitaciones } from './pages/TableroHabitaciones';
import { SupervisorPanel } from './pages/SupervisorPanel';
import { MisTareas } from './pages/MisTareas';
import { GerentePanel } from './pages/GerentePanel';
import { IntegracionesPanel } from './pages/IntegracionesPanel';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/tablero" replace />} />
              <Route path="/tablero" element={<TableroHabitaciones />} />
              <Route path="/supervisor" element={<SupervisorPanel />} />
              <Route path="/mis-tareas" element={<MisTareas />} />
              <Route path="/gerente" element={<GerentePanel />} />
              <Route path="/integraciones" element={<IntegracionesPanel />} />
            </Route>

            <Route path="*" element={<Navigate to="/tablero" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
