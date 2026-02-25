import type { PruebaSanitaria } from "@/modules/pruebas/domain/entities/PruebasEntity";

export const pruebasMock: PruebaSanitaria[] = [
  { id: 1, fecha: "2024-08-10", mvz: "MVZ. Ana Garcia",    supervisor: "Dr. Carlos Martinez", lugar: "Rancho El Potrero",    motivo: "Exportacion",              tb: "Negativo", br: "Negativo", resultado: "Aprobado",  estado: "Completada" },
  { id: 2, fecha: "2024-08-08", mvz: "MVZ. Roberto Diaz",  supervisor: "Dr. Carlos Martinez", lugar: "Rancho San Miguel",    motivo: "Campana",                  tb: "Negativo", br: "Negativo", resultado: "Aprobado",  estado: "Completada" },
  { id: 3, fecha: "2024-08-06", mvz: "MVZ. Sofia Herrera", supervisor: "Dr. Carlos Martinez", lugar: "Rancho La Esperanza",  motivo: "Exportacion",              tb: "Positivo", br: "Negativo", resultado: "Rechazado", estado: "Completada" },
  { id: 4, fecha: "2024-08-15", mvz: "MVZ. Ana Garcia",    supervisor: "-",                   lugar: "Rancho Las Palmas",   motivo: "Movilizacion",             tb: "Pendiente", br: "Pendiente", resultado: "Pendiente", estado: "En proceso" },
  { id: 5, fecha: "2024-08-14", mvz: "MVZ. Roberto Diaz",  supervisor: "-",                   lugar: "Rancho Los Alamos",   motivo: "Exportacion",              tb: "Pendiente", br: "Pendiente", resultado: "Pendiente", estado: "Pendiente" },
  { id: 6, fecha: "2024-07-22", mvz: "MVZ. Sofia Herrera", supervisor: "Dr. Carlos Martinez", lugar: "Rancho El Potrero",   motivo: "Vigilancia epidemiologica", tb: "Negativo", br: "Negativo", resultado: "Aprobado",  estado: "Completada" },
];
