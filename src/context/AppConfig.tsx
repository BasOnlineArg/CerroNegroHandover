import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { databases, DATABASE_ID, COLLECTIONS } from '../appwrite';
import { TeamConfig, CompanyConfig } from '../types';

export type { TeamConfig, CompanyConfig };

export const DEFAULT_CONFIG: CompanyConfig = {
  companyName: 'Mi Empresa',
  teams: [
    { id: 'operations',  name: 'Operaciones',       icon: 'fa-gears',              subteams: [] },
    { id: 'engineering', name: 'Ingeniería',         icon: 'fa-screwdriver-wrench', subteams: [] },
    { id: 'maintenance', name: 'Mantenimiento',      icon: 'fa-toolbox',            subteams: [] },
    { id: 'quality',     name: 'Control de Calidad', icon: 'fa-circle-check',       subteams: [] },
    { id: 'logistics',   name: 'Logística',          icon: 'fa-truck',              subteams: [] },
    { id: 'support',     name: 'Soporte',            icon: 'fa-headset',            subteams: [] },
  ],
};

const CONFIG_DOC_ID = 'app-config';

interface AppConfigContextType {
  config: CompanyConfig;
  saveConfig: (newConfig: CompanyConfig) => Promise<void>;
  isLoadingConfig: boolean;
}

const AppConfigContext = createContext<AppConfigContextType>({
  config: DEFAULT_CONFIG,
  saveConfig: async () => {},
  isLoadingConfig: true,
});

export const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<CompanyConfig>(DEFAULT_CONFIG);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    databases.getDocument(DATABASE_ID, COLLECTIONS.SETTINGS, CONFIG_DOC_ID)
      .then(doc => {
        setConfig({
          companyName: doc.companyName || DEFAULT_CONFIG.companyName,
          teams: doc.teamsJson ? JSON.parse(doc.teamsJson) : DEFAULT_CONFIG.teams,
        });
      })
      .catch(() => setConfig(DEFAULT_CONFIG))
      .finally(() => setIsLoadingConfig(false));
  }, []);

  const saveConfig = useCallback(async (newConfig: CompanyConfig) => {
    const data = {
      companyName: newConfig.companyName,
      teamsJson: JSON.stringify(newConfig.teams),
    };
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.SETTINGS, CONFIG_DOC_ID, data);
    } catch {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.SETTINGS, CONFIG_DOC_ID, data);
    }
    setConfig(newConfig);
  }, []);

  return (
    <AppConfigContext.Provider value={{ config, saveConfig, isLoadingConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = () => useContext(AppConfigContext);
