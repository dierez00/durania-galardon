import type { Exportacion } from "../../domain/entities/ExportacionesEntity";

export const exportacionesMock: Exportacion[] = [
  { id: 1, arete: "MX-4521-8890", productor: "Juan Perez", rancho: "El Potrero", mvz: "MVZ. Ana Garcia", prueba: "2024-08-10", reactor: "No", areteAzul: "AZ-001-2024", estado: "Aprobada" },
  { id: 2, arete: "MX-4521-8891", productor: "Juan Perez", rancho: "El Potrero", mvz: "MVZ. Ana Garcia", prueba: "2024-08-10", reactor: "No", areteAzul: "AZ-002-2024", estado: "Aprobada" },
  { id: 3, arete: "MX-6720-3345", productor: "Pedro Gomez", rancho: "San Miguel", mvz: "MVZ. Roberto Diaz", prueba: "2024-08-08", reactor: "No", areteAzul: "-", estado: "En revision" },
  { id: 4, arete: "MX-8901-1121", productor: "Roberto Hernandez", rancho: "La Esperanza", mvz: "MVZ. Sofia Herrera", prueba: "2024-08-06", reactor: "No", areteAzul: "-", estado: "Pendiente" },
  { id: 5, arete: "MX-8901-1120", productor: "Roberto Hernandez", rancho: "La Esperanza", mvz: "MVZ. Sofia Herrera", prueba: "2024-08-06", reactor: "Si", areteAzul: "-", estado: "Rechazada" },
  { id: 6, arete: "MX-6720-3346", productor: "Pedro Gomez", rancho: "San Miguel", mvz: "MVZ. Roberto Diaz", prueba: "2024-08-08", reactor: "No", areteAzul: "AZ-003-2024", estado: "Aprobada" },
];
