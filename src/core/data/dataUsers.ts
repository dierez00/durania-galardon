import type { User } from "@/core/users/types";

export const users: User[] = [
  { id: 1, nombre: "Dr. Carlos Martinez",  email: "carlos@siiniga.gob.mx",           rol: "Administrador", estado: "Activo",   ultimo: "2024-08-15" },
  { id: 2, nombre: "MVZ. Ana Garcia",       email: "ana.garcia@siiniga.gob.mx",       rol: "MVZ",           estado: "Activo",   ultimo: "2024-08-15" },
  { id: 3, nombre: "Maria Lopez",           email: "maria.lopez@siiniga.gob.mx",      rol: "Ventanilla",    estado: "Activo",   ultimo: "2024-08-14" },
  { id: 4, nombre: "Juan Perez Ramirez",    email: "juan.perez@correo.com",           rol: "Productor",     estado: "Activo",   ultimo: "2024-08-13" },
  { id: 5, nombre: "MVZ. Roberto Diaz",     email: "roberto.diaz@siiniga.gob.mx",     rol: "MVZ",           estado: "Activo",   ultimo: "2024-08-12" },
  { id: 6, nombre: "Laura Sanchez",         email: "laura.sanchez@siiniga.gob.mx",    rol: "Ventanilla",    estado: "Inactivo", ultimo: "2024-07-20" },
  { id: 7, nombre: "Pedro Gomez Torres",    email: "pedro.gomez@correo.com",          rol: "Productor",     estado: "Activo",   ultimo: "2024-08-11" },
  { id: 8, nombre: "MVZ. Sofia Herrera",    email: "sofia.herrera@siiniga.gob.mx",    rol: "MVZ",           estado: "Activo",   ultimo: "2024-08-15" },
];
