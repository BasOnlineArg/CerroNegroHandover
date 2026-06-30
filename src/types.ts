
export enum FleetType {
  OPERATIONS = "Operaciones",
  ENGINEERING = "Ingeniería",
  MAINTENANCE = "Mantenimiento",
  QUALITY = "Control de Calidad",
  LOGISTICS = "Logística",
  SUPPORT = "Soporte",
  GLOBAL_KPIS = "KPIs Globales"
}

export interface TeamConfig {
  id: string;
  name: string;
  icon: string;
  subteams: string[];
}

export interface CompanyConfig {
  companyName: string;
  teams: TeamConfig[];
}

export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  SUPERVISOR = "supervisor",
  OPERATOR = "operator",
  ANALYST = "analyst",
  TECHNICIAN = "technician",
  VIEWER = "viewer",
  SUPPORT_ROLE = "support"
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: any;
}

export interface ActionLog {
  id: string;
  timestamp: any;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
}

export interface WorkOrder {
  id: string;
  otNumber: string;
  description: string;
  bkls: string;
  isClosed: boolean;
}

export interface Notification {
  id: string;
  avisoNumber: string;
  description: string;
}

export interface RiskItem {
  id: string;
  name: string;
  icon: string;
}

export const RISK_ITEMS: RiskItem[] = [
  { id: 'risk-1',  name: 'Trabajo en Altura',     icon: 'fa-arrows-up-to-line' },
  { id: 'risk-2',  name: 'Riesgo Eléctrico',       icon: 'fa-bolt-lightning' },
  { id: 'risk-3',  name: 'Equipos y Maquinaria',   icon: 'fa-gears' },
  { id: 'risk-4',  name: 'Incendio / Explosión',   icon: 'fa-fire-flame-curved' },
  { id: 'risk-5',  name: 'Materiales Peligrosos',  icon: 'fa-biohazard' },
  { id: 'risk-6',  name: 'Espacios Confinados',    icon: 'fa-door-closed' },
  { id: 'risk-7',  name: 'Vehículos / Transporte', icon: 'fa-car-burst' },
  { id: 'risk-8',  name: 'Carga y Descarga',       icon: 'fa-boxes-stacked' },
  { id: 'risk-9',  name: 'Riesgo Químico',         icon: 'fa-flask' },
  { id: 'risk-10', name: 'Trabajos en Caliente',   icon: 'fa-temperature-high' },
  { id: 'risk-11', name: 'Caída de Objetos',       icon: 'fa-box-open' },
  { id: 'risk-12', name: 'Izaje y Elevación',      icon: 'fa-crane' },
  { id: 'risk-13', name: 'Ruido / Vibraciones',    icon: 'fa-wave-square' },
  { id: 'risk-14', name: 'Ergonomía',              icon: 'fa-person-falling' },
  { id: 'risk-15', name: 'Radiaciones',            icon: 'fa-radiation' },
];

export interface HandoverEntry {
  id: string;
  timestamp: string;
  shiftDate: string;
  weekOfYear: number;
  fleet: string;
  subteam?: string;
  ots: WorkOrder[];
  notifications: Notification[];
  generalNotes: string;
  author: string;
  frmRisks: string[];
  uid: string;
}
