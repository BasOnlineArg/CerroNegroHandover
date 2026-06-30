
import React from 'react';
import { FleetType, HandoverEntry } from '../types';


interface KPIStats {
  otsGenerated: number;
  otsOpen: number;
  otsClosed: number;
  avisosGenerated: number;
  bklsGenerated: number;
  pasesGenerados: number;
}

interface Props {
  entries: HandoverEntry[];
  title: string;
  isGlobal?: boolean;
}

export const KPISection: React.FC<Props> = ({ entries, title, isGlobal = false }) => {
  const calculateStats = (data: HandoverEntry[]): KPIStats => {
    let otsGenerated = 0;
    let otsOpen = 0;
    let otsClosed = 0;
    let avisosGenerated = 0;
    let bklsGenerated = 0;

    data.forEach(entry => {
      const ots = entry.ots || [];
      const notifications = entry.notifications || [];
      
      otsGenerated += ots.length;
      otsOpen += ots.filter(ot => !ot.isClosed).length;
      otsClosed += ots.filter(ot => ot.isClosed).length;
      avisosGenerated += notifications.length;
      bklsGenerated += notifications.filter(n => 
        (n.avisoNumber || '').toUpperCase().startsWith('BKL') || 
        (n.description || '').toUpperCase().startsWith('BKL')
      ).length;
    });

    return { 
      otsGenerated, 
      otsOpen, 
      otsClosed,
      avisosGenerated, 
      bklsGenerated,
      pasesGenerados: data.length 
    };
  };

  const stats = calculateStats(entries);
  const maxVal = Math.max(stats.otsGenerated, stats.avisosGenerated, 10);

  const StatCard = ({ label, value, color, icon, tooltip }: { label: string, value: number, color: string, icon: string, tooltip: string }) => (
    <div 
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group cursor-help"
      title={tooltip}
    >
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
          <i className={`fa-solid ${icon} ${color.replace('bg-', 'text-')}`}></i>
        </div>
        <span className="text-2xl font-black text-slate-800">{value}</span>
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      
      {/* Visual Tooltip (Hover effect for desktop) */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center font-medium">
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
      </div>

      <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000`} 
          style={{ width: `${Math.min((value / maxVal) * 100, 100)}%` }}
        ></div>
      </div>
    </div>
  );

  const FleetDistribution = () => {
    const fleetData = Object.values(FleetType)
      .filter(f => f !== FleetType.GLOBAL_KPIS)
      .map(f => ({
        name: f,
        count: entries.filter(e => e.fleet === f).reduce((acc, curr) => acc + curr.ots.length, 0)
      }));

    const maxFleetCount = Math.max(...fleetData.map(f => f.count), 1);

    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Distribución de Tareas por Equipo</h4>
        <div className="space-y-4">
          {fleetData.map(f => (
            <div key={f.name}>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-600">{f.name}</span>
                <span className="text-blue-600">{f.count} Tareas</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${(f.count / maxFleetCount) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const UserMetrics = () => {
    const userData = entries.reduce((acc: any, curr) => {
      const author = curr.author || 'Desconocido';
      const ots = curr.ots || [];
      const notifications = curr.notifications || [];

      if (!acc[author]) {
        acc[author] = { 
          handovers: 0, 
          otsGenerated: 0, 
          otsOpen: 0, 
          otsClosed: 0, 
          avisos: 0, 
          bkls: 0 
        };
      }
      acc[author].handovers += 1;
      acc[author].otsGenerated += ots.length;
      acc[author].otsOpen += ots.filter(ot => !ot.isClosed).length;
      acc[author].otsClosed += ots.filter(ot => ot.isClosed).length;
      acc[author].avisos += notifications.length;
      acc[author].bkls += notifications.filter(n => 
        (n.avisoNumber || '').toUpperCase().startsWith('BKL') || 
        (n.description || '').toUpperCase().startsWith('BKL')
      ).length;
      return acc;
    }, {});

    const sortedUsers = Object.entries(userData)
      .map(([name, stats]: any) => ({ name, ...stats }))
      .sort((a, b) => b.handovers - a.handovers);

    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6 col-span-full">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Métricas Detalladas por Responsable</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</th>
                <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pases</th>
                <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tareas Gen.</th>
                <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pendientes</th>
                <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cerradas</th>
                <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Novedades</th>
                <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Bloqueos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedUsers.map((user: any) => (
                <tr key={user.name} className="hover:bg-slate-50/50 transition">
                  <td className="py-3">
                    <span className="text-xs font-black text-slate-700">{user.name}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-xs font-bold text-blue-600">{user.handovers}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-xs font-bold text-slate-600">{user.otsGenerated}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-xs font-bold text-amber-600">{user.otsOpen}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-xs font-bold text-emerald-600">{user.otsClosed}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-xs font-bold text-indigo-600">{user.avisos}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-xs font-bold text-rose-600">{user.bkls}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-slate-200"></div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
        <div className="h-px flex-1 bg-slate-200"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Pases Generados"
          value={stats.pasesGenerados}
          color="bg-slate-600"
          icon="fa-clipboard-list"
          tooltip="Total de pases de turno realizados."
        />
        <StatCard
          label="Tareas Registradas"
          value={stats.otsGenerated}
          color="bg-blue-600"
          icon="fa-file-invoice"
          tooltip="Total acumulado de tareas registradas en pases de turno."
        />
        <StatCard
          label="Tareas Pendientes"
          value={stats.otsOpen}
          color="bg-amber-500"
          icon="fa-folder-open"
          tooltip="Tareas que aún requieren atención o resolución."
        />
        <StatCard
          label="Tareas Cerradas"
          value={stats.otsClosed}
          color="bg-emerald-600"
          icon="fa-file-circle-check"
          tooltip="Tareas completadas y cerradas exitosamente."
        />
        <StatCard
          label="Novedades"
          value={stats.avisosGenerated}
          color="bg-indigo-600"
          icon="fa-bell"
          tooltip="Novedades o alertas registradas en los turnos."
        />
        <StatCard
          label="Bloqueos"
          value={stats.bklsGenerated}
          color="bg-rose-600"
          icon="fa-layer-group"
          tooltip="Bloqueos o impedimentos detectados y registrados."
        />
      </div>

      {isGlobal && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <FleetDistribution />
          </div>
          <div className="lg:col-span-2">
            <UserMetrics />
          </div>
        </div>
      )}
    </div>
  );
};
