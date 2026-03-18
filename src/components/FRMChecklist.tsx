
import React from 'react';
import { FRM_RISKS } from '../types';

interface Props {
  selectedRisks: string[];
  toggleRisk: (id: string) => void;
}

export const FRMChecklist: React.FC<Props> = ({ selectedRisks, toggleRisk }) => {
  return (
    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg shadow-sm">
      <h3 className="text-orange-800 font-bold mb-3 flex items-center">
        <i className="fa-solid fa-shield-halved mr-2"></i>
        FATALITY RISK MANAGEMENT (FRM) - Control de Riesgos Críticos
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {FRM_RISKS.map((risk) => (
          <button
            key={risk.id}
            onClick={() => toggleRisk(risk.id)}
            className={`flex flex-col items-center p-2 rounded border transition-all ${
              selectedRisks.includes(risk.id)
                ? 'bg-orange-600 text-white border-orange-700'
                : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
            }`}
          >
            <i className={`fa-solid ${risk.icon} text-lg mb-1`}></i>
            <span className="text-[10px] text-center font-semibold uppercase leading-tight">
              {risk.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
