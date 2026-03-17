import { UserRole } from "../types";

export const INITIAL_WHITELIST = [
  { email: "admin.admin@newmont.com", pass: "Admin2026", role: UserRole.ADMIN },
  { email: "andres.camejo@newmont.com", pass: "Andres01", role: UserRole.SUPERVISOR },
  { email: "antonio.romero@newmont.com", pass: "Antonio01", role: UserRole.SUPERVISOR },
  { email: "sebastian.palma@newmont.com", pass: "Sebastian01", role: UserRole.INSPECTOR_ESTRUCTURAL },
  { email: "oscar.frete@newmont.com", pass: "Oscar01", role: UserRole.ESTRUCTURAL },
  { email: "alexis.aman@newmont.com", pass: "Alexis01", role: UserRole.MULTIFLOTA },
  { email: "leonel.quintana@newmont.com", pass: "Leonel01", role: UserRole.PERFO },
  { email: "matias.cativa@newmont.com", pass: "Matias01", role: UserRole.ELECTRICO },
  { email: "jose.perez@newmont.com", pass: "Jose01", role: UserRole.ELECTRICO },
  { email: "pablo.aguilera@newmont.com", pass: "Pablo01", role: UserRole.PERFO },
  { email: "tito.yugra@newmont.com", pass: "Tito01", role: UserRole.PYC },
  { email: "gomeria.gomeria@newmont.com", pass: "Gomeria01", role: UserRole.GOMERIA },
];
