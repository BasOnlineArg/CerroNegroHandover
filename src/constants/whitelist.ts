import { UserRole } from "../types";

export const INITIAL_WHITELIST = [
  { email: "admin@empresa.com",       pass: "Admin2025",   role: UserRole.ADMIN },
  { email: "gerencia@empresa.com",    pass: "Manager01",   role: UserRole.MANAGER },
  { email: "supervisor@empresa.com",  pass: "Supervisor01", role: UserRole.SUPERVISOR },
  { email: "operaciones@empresa.com", pass: "Operador01",  role: UserRole.OPERATOR },
  { email: "ingenieria@empresa.com",  pass: "Ingeniero01", role: UserRole.ANALYST },
  { email: "mantenimiento@empresa.com", pass: "Tecnico01", role: UserRole.TECHNICIAN },
  { email: "calidad@empresa.com",     pass: "Calidad01",   role: UserRole.ANALYST },
  { email: "logistica@empresa.com",   pass: "Logistica01", role: UserRole.OPERATOR },
  { email: "soporte@empresa.com",     pass: "Soporte01",   role: UserRole.SUPPORT_ROLE },
  { email: "usuario1@empresa.com",    pass: "Usuario01",   role: UserRole.VIEWER },
  { email: "usuario2@empresa.com",    pass: "Usuario02",   role: UserRole.VIEWER },
  { email: "usuario3@empresa.com",    pass: "Usuario03",   role: UserRole.TECHNICIAN },
];
