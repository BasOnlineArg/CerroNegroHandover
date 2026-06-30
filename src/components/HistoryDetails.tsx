
import React, { useState } from 'react';
import { HandoverEntry, RISK_ITEMS } from '../types';
import { analyzeMaintenanceData } from '../services/geminiService';

interface Props {
  entry: HandoverEntry;
  onClose: () => void;
}

export const HistoryDetails: React.FC<Props> = ({ entry, onClose }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeMaintenanceData(entry);
      setAnalysis(result);
    } catch (error) {
      console.error("Error in AI analysis:", error);
      setAnalysis("Error al generar el análisis técnico. Por favor intente nuevamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return ts;
      return date.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return ts;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Detalle */}
        <div className="bg-slate-900 px-10 py-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl">
              {entry.author.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black uppercase tracking-tight">{entry.author || 'Desconocido'}</h2>
                <span className="bg-emerald-600/20 text-emerald-400 text-[9px] font-black px-3 py-1 rounded-full uppercase border border-emerald-500/30">Registro Cerrado</span>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                {entry.shiftDate || 'Fecha no registrada'} | Equipo: {entry.fleet || 'N/A'} | {formatTimestamp(entry.timestamp)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 p-4 rounded-xl transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest border border-white/10"
          >
            <i className="fa-solid fa-arrow-left"></i> Volver
          </button>
        </div>

        <div className="p-10 space-y-12">
          {/* Asistente de Ingeniería IA */}
          <section className="bg-blue-900 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-microchip text-blue-400 text-xl"></i>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Asistente de Análisis IA</h3>
                  <p className="text-[10px] text-blue-300 font-bold uppercase mt-1">Análisis inteligente del pase de turno</p>
                </div>
              </div>
              <button 
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  isAnalyzing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-400 text-white'
                }`}
              >
                {isAnalyzing ? (
                  <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Procesando...</>
                ) : (
                  <><i className="fa-solid fa-wand-magic-sparkles mr-2"></i> Generar Informe Técnico</>
                )}
              </button>
            </div>
            
            {analysis && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-sm font-medium leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar whitespace-pre-wrap font-mono text-slate-200">
                {analysis}
              </div>
            )}
          </section>

          {/* FRM Risks Visualization */}
          {entry.frmRisks && entry.frmRisks.length > 0 && (
            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                <i className="fa-solid fa-shield-halved text-orange-600"></i> Riesgos Críticos Identificados
              </h3>
              <div className="flex flex-wrap gap-3">
                {entry.frmRisks.map(riskId => {
                  const risk = RISK_ITEMS.find(r => r.id === riskId);
                  return risk ? (
                    <div key={riskId} className="bg-orange-100 text-orange-800 px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border border-orange-200 shadow-sm">
                      <i className={`fa-solid ${risk.icon} text-orange-600`}></i> {risk.name}
                    </div>
                  ) : null;
                })}
              </div>
            </section>
          )}

          {/* Metadatos Técnicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Semana Operativa</p>
                <p className="text-sm font-black text-slate-800 uppercase">Semana {entry.weekOfYear}</p>
             </div>
             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rendimiento Turno</p>
                <p className="text-sm font-black text-slate-800">
                  {Math.round(((entry.ots || []).filter(o => o.isClosed).length / ((entry.ots || []).length || 1)) * 100)}% Completado
                </p>
             </div>
             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Novedades Registradas</p>
                <p className="text-sm font-black text-slate-800 uppercase">{(entry.notifications || []).length} Avisos</p>
             </div>
          </div>

          {/* OTs Realizadas */}
          <section>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <i className="fa-solid fa-list-check text-blue-600"></i> Desglose de Ordenes de Trabajo
            </h3>
            <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Orden</th>
                    <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Actividad</th>
                    <th className="px-8 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {(entry.ots || []).map((ot) => (
                    <tr key={ot.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 text-sm font-bold text-blue-600">#{ot.otNumber}</td>
                      <td className="px-8 py-5 text-sm text-slate-600 font-medium">{ot.description}</td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${ot.isClosed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {ot.isClosed ? 'Finalizado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!entry.ots || entry.ots.length === 0) && (
                    <tr><td colSpan={3} className="px-8 py-10 text-center text-slate-300 italic text-sm">Sin actividades registradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Avisos Técnicos */}
          <section>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation text-amber-500"></i> Avisos y Hallazgos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(entry.notifications || []).map((aviso) => (
                <div key={aviso.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
                    <i className="fa-solid fa-clipboard-list text-xl"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">#{aviso.avisoNumber}</p>
                    <p className="text-sm text-slate-500 mt-1 leading-snug">{aviso.description}</p>
                  </div>
                </div>
              ))}
              {(!entry.notifications || entry.notifications.length === 0) && (
                <div className="col-span-full py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                  No se reportaron avisos adicionales
                </div>
              )}
            </div>
          </section>

          {/* Notas de Ingeniería */}
          <section>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
              <i className="fa-solid fa-file-invoice text-blue-600"></i> Notas de Inspección
            </h3>
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 italic text-slate-700 leading-relaxed text-sm shadow-inner">
              "{entry.generalNotes || 'No se registraron observaciones para este reporte de turno.'}"
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
