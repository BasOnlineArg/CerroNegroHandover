
export enum FleetType {
  STRUCTURAL = "Estructural",
  ELECTRICAL = "Electrico",
  DRILLS = "Perforadoras",
  AUXILIARY = "Multiflota",
  SHOVELS_TRUCKS = "Palas y Camiones",
  GOMERIA = "Gomeria",
  RELIABILITY_KPIS = "KPIs Confiabilidad"
}

export enum UserRole {
  ADMIN = "admin",
  SUPERVISOR = "supervisor",
  ESTRUCTURAL = "estructural",
  INSPECTOR_ESTRUCTURAL = "inspector estructural",
  ELECTRICO = "electrico",
  PERFO = "perfo",
  PYC = "pyc",
  MULTIFLOTA = "multiflota",
  GOMERIA = "gomeria"
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

export interface FRMRisk {
  id: string;
  name: string;
  icon: string;
}

// Defining FRM risks as per Fatality Risk Management standards in mining
export const FRM_RISKS: FRMRisk[] = [
  { id: 'frm-1', name: 'Espacios Confinados', icon: 'fa-door-closed' },
  { id: 'frm-2', name: 'Contacto Electricidad', icon: 'fa-bolt-lightning' },
  { id: 'frm-3', name: 'Atrapamiento Equipos', icon: 'fa-gears' },
  { id: 'frm-4', name: 'Caída en Altura', icon: 'fa-arrows-up-to-line' },
  { id: 'frm-5', name: 'Inestabilidad Terreno', icon: 'fa-mountain-sun' },
  { id: 'frm-6', name: 'Colisión Vehículos', icon: 'fa-car-burst' },
  { id: 'frm-7', name: 'Vuelco de Vehículos', icon: 'fa-truck-field-unpaved' },
  { id: 'frm-8', name: 'Grúas e Izaje', icon: 'fa-crane' },
  { id: 'frm-9', name: 'Caída de Objetos', icon: 'fa-box-open' },
  { id: 'frm-10', name: 'Vehículo al Vacío', icon: 'fa-arrow-trend-down' },
  { id: 'frm-11', name: 'Incendio/Explosión', icon: 'fa-fire-flame-curved' },
  { id: 'frm-12', name: 'Materiales Peligrosos', icon: 'fa-biohazard' },
  { id: 'frm-13', name: 'Explosivos', icon: 'fa-bomb' },
  { id: 'frm-14', name: 'Aviación', icon: 'fa-plane-departure' },
  { id: 'frm-15', name: 'Gases y Polvos', icon: 'fa-mask-face' },
  { id: 'frm-16', name: 'Caída al Agua', icon: 'fa-person-swimming' },
  { id: 'frm-17', name: 'Excavaciones', icon: 'fa-shovels' },
  { id: 'frm-18', name: 'Obras Temporales', icon: 'fa-trowel-bricks' }
];

export interface HandoverEntry {
  id: string;
  timestamp: string; // Fecha de creación del registro
  shiftDate: string; // Fecha efectiva del cambio de turno
  weekOfYear: number; // Semana del año (ISO)
  fleet: FleetType;
  ots: WorkOrder[];
  notifications: Notification[];
  generalNotes: string;
  author: string;
  frmRisks: string[]; // List of FRM risk IDs active during the shift
  uid: string; // User ID of the creator
}
