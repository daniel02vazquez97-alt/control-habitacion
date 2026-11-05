import React from 'react';
import { BookOpen, CheckCircle, ShieldAlert, Users, Sparkles } from 'lucide-react';

export const InstruccionFR0801: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 text-slate-700">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
        <BookOpen className="w-5 h-5 text-indigo-600" />
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Documento Normativo</span>
          <h4 className="text-sm font-bold text-slate-900">FR08-01: Instrucción para Control de Habitaciones</h4>
        </div>
      </div>

      <div className="space-y-3 text-xs leading-relaxed">
        <div>
          <h5 className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            1. Asignación del Personal
          </h5>
          <p className="text-slate-600 pl-5">
            Toda habitación en estado <strong className="text-amber-700">VACANTE_SUCIA</strong> debe asignarse únicamente a personal activo y presente en el turno matutino (07:00 a 15:00): una <strong>Camarista</strong> y un <strong>Auxiliar de Habitaciones</strong>.
          </p>
        </div>

        <div>
          <h5 className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            2. Ejecución en Paralelo
          </h5>
          <p className="text-slate-600 pl-5">
            La Camarista efectúa la limpieza profunda, ventilación, desinfección y preparación de cama. Simultáneamente, el Auxiliar realiza la reposición completa de blancos (toallas, tapetes) y suministros de baño/amenidades.
          </p>
        </div>

        <div>
          <h5 className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-4 h-4 text-sky-600" />
            3. Reporte de Habitación Limpia
          </h5>
          <p className="text-slate-600 pl-5">
            Solo cuando ambos colaboradores hayan confirmado el 100% de sus respectivas tareas, la Camarista queda facultada para emitir el reporte de habitación limpia, transitando a <strong className="text-sky-700">VACANTE_LIMPIA</strong>.
          </p>
        </div>

        <div>
          <h5 className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            4. Criterio de Bloqueo por Daños
          </h5>
          <p className="text-slate-600 pl-5">
            Si durante la inspección se evidencia avería en equipamiento (A/C, TV, cerradura, sanitarios), la habitación transita a <strong className="text-red-700">BLOQUEADA</strong> con notificación inmediata a Reservaciones.
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Área de Hospedaje</span>
        <span>Revisión vigente 2026</span>
      </div>
    </div>
  );
};
