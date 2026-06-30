
import React, { useState, useMemo, useRef } from 'react';
import { FleetType, WorkOrder, Notification } from '../types';
import * as XLSX from 'xlsx';
import { KPISection } from './KPISection';
import { RiskChecklist } from './FRMChecklist';

interface Props {
  fleet: FleetType;
  onSubmit: (entry: any) => void;
  history: any[]; 
  currentUser: any;
}

export const HandoverForm: React.FC<Props> = ({ fleet, onSubmit, history, currentUser }) => {
  const [ots, setOts] = useState<WorkOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notes, setNotes] = useState('');
  const [author, setAuthor] = useState(currentUser?.displayName || currentUser?.email?.split('@')[0] || '');
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [error, setError] = useState<string | null>(null);
  
  const otInputRef = useRef<HTMLInputElement>(null);
  const avisoInputRef = useRef<HTMLInputElement>(null);

  const getISOWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const currentWeek = useMemo(() => getISOWeek(shiftDate), [shiftDate]);

  const addOT = () => {
    const newOT: WorkOrder = {
      id: crypto.randomUUID(),
      otNumber: '',
      description: '',
      bkls: '',
      isClosed: false
    };
    setOts([...ots, newOT]);
  };

  const addAviso = () => {
    const newAviso: Notification = {
      id: crypto.randomUUID(),
      avisoNumber: '',
      description: ''
    };
    setNotifications([...notifications, newAviso]);
  };

  const updateOT = (id: string, field: keyof WorkOrder, value: any) => {
    setOts(ots.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const updateAviso = (id: string, field: keyof Notification, value: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  // Toggle risk selection for FRM compliance
  const toggleRisk = (id: string) => {
    setSelectedRisks(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'OT' | 'AVISO') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      if (type === 'OT') {
        const importedOts: WorkOrder[] = data.map((item: any) => ({
          id: crypto.randomUUID(),
          otNumber: String(item.OT || item.otNumber || item.NRO || ''),
          description: String(item.Descripcion || item.description || ''),
          bkls: String(item.BKL || item.bkls || ''),
          isClosed: !!(item.Cerrado || item.isClosed || false)
        }));
        setOts(prev => [...prev, ...importedOts]);
      } else {
        const importedAvisos: Notification[] = data.map((item: any) => ({
          id: crypto.randomUUID(),
          avisoNumber: String(item.Aviso || item.avisoNumber || item.NRO || ''),
          description: String(item.Descripcion || item.description || '')
        }));
        setNotifications(prev => [...prev, ...importedAvisos]);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; 
  };

  const handleHandover = () => {
    if (!author || !shiftDate) {
      setError("Por favor complete el Creador y la Fecha del Turno.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    onSubmit({
      fleet,
      ots,
      notifications,
      generalNotes: notes,
      timestamp: new Date().toISOString(), // Use ISO string for better sorting/filtering
      shiftDate,
      weekOfYear: currentWeek,
      author,
      frmRisks: selectedRisks
    });

    setOts([]);
    setNotifications([]);
    setNotes('');
    setAuthor('');
    setSelectedRisks([]);
    setError(null);
  };

  const currentEntries = [...history.filter(e => e.fleet === fleet)];

  return (
    <div className="space-y-10">
      {error && (
        <div className="fixed top-10 right-10 bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex items-center gap-3">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span className="text-xs font-black uppercase tracking-widest">{error}</span>
        </div>
      )}
      {/* SECCIÓN 1: Identificación Técnica */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
           <i className="fa-solid fa-id-card text-blue-600"></i> Identificación del Turno
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Responsable del Turno</label>
            <div className="relative group">
              <i className="fa-solid fa-user-check absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition"></i>
              <input 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold transition-all"
                placeholder="Nombre del Responsable"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fecha de Ejecución</label>
            <div className="relative group">
              <i className="fa-solid fa-calendar-alt absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition"></i>
              <input 
                type="date"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold transition-all"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Tareas Ejecutadas (OTs) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-toolbox text-blue-600"></i> Tareas / Acciones
          </h3>
          <div className="flex gap-3">
            <button 
              onClick={() => otInputRef.current?.click()} 
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black hover:bg-emerald-700 transition uppercase tracking-widest flex items-center gap-2 shadow-sm"
            >
              <i className="fa-solid fa-file-excel"></i> Importar de Excel
            </button>
            <button onClick={addOT} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-black hover:bg-slate-700 transition uppercase tracking-widest shadow-sm">
              + Agregar Tarea
            </button>
          </div>
        </div>
        <input type="file" ref={otInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileUpload(e, 'OT')} />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">ID Tarea</th>
                <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción</th>
                <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Observación / Bloqueo</th>
                <th className="px-8 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest w-24">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ots.map((ot) => (
                <tr key={ot.id} className="hover:bg-slate-50 transition">
                  <td className="px-8 py-4"><input className="w-full bg-transparent outline-none text-sm font-bold text-blue-600" placeholder="0000..." value={ot.otNumber} onChange={(e) => updateOT(ot.id, 'otNumber', e.target.value)}/></td>
                  <td className="px-8 py-4"><input className="w-full bg-transparent outline-none text-sm" placeholder="Tarea realizada..." value={ot.description} onChange={(e) => updateOT(ot.id, 'description', e.target.value)}/></td>
                  <td className="px-8 py-4"><input className="w-full bg-transparent outline-none text-sm italic" placeholder="Hallazgos..." value={ot.bkls} onChange={(e) => updateOT(ot.id, 'bkls', e.target.value)}/></td>
                  <td className="px-8 py-4 text-center">
                    <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={ot.isClosed} onChange={(e) => updateOT(ot.id, 'isClosed', e.target.checked)}/>
                  </td>
                </tr>
              ))}
              {ots.length === 0 && (
                <tr><td colSpan={4} className="px-8 py-10 text-center text-slate-300 text-xs italic">No hay registros manuales. Importe de Excel o agregue filas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 3: Avisos y Hallazgos */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-amber-500"></i> Novedades del Turno
          </h3>
          <div className="flex gap-3">
            <button 
              onClick={() => avisoInputRef.current?.click()} 
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black hover:bg-emerald-700 transition uppercase tracking-widest flex items-center gap-2 shadow-sm"
            >
              <i className="fa-solid fa-file-excel"></i> Importar de Excel
            </button>
            <button onClick={addAviso} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-black hover:bg-slate-700 transition uppercase tracking-widest shadow-sm">
              + Agregar Novedad
            </button>
          </div>
        </div>
        <input type="file" ref={avisoInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileUpload(e, 'AVISO')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notifications.map((aviso) => (
            <div key={aviso.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex gap-3 group focus-within:ring-2 focus-within:ring-blue-500/10">
              <input className="w-24 bg-transparent outline-none text-xs font-black text-slate-800 border-r border-slate-200 pr-2" placeholder="Nº / Ref." value={aviso.avisoNumber} onChange={(e) => updateAviso(aviso.id, 'avisoNumber', e.target.value)}/>
              <input className="flex-1 bg-transparent outline-none text-xs" placeholder="Detalle del hallazgo..." value={aviso.description} onChange={(e) => updateAviso(aviso.id, 'description', e.target.value)}/>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 4: Control de Riesgos Críticos */}
      <div className="pt-4">
        <RiskChecklist selectedRisks={selectedRisks} toggleRisk={toggleRisk} />
      </div>

      {/* SECCIÓN 5: Comentarios Generales */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <i className="fa-solid fa-comment-dots text-slate-400"></i> Observaciones Finales
        </h3>
        <textarea
          className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm leading-relaxed"
          placeholder="Notas adicionales para el turno entrante..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Acción Final */}
      <div className="flex justify-end">
        <button 
          onClick={handleHandover}
          className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition-all flex items-center gap-4 shadow-xl shadow-blue-500/20 active:scale-95"
        >
          <i className="fa-solid fa-paper-plane"></i>
          Enviar Pase de Turno
        </button>
      </div>

      {/* KPIs al Pie */}
      <div className="pt-10 border-t border-slate-200">
        <KPISection entries={currentEntries} title={`Estadísticas Semanales - ${fleet}`} />
      </div>
    </div>
  );
};
