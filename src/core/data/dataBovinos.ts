export interface Bovino {
  id: number;
  arete: string;
  sexo: string;
  raza: string;
  peso: number;
  nacimiento: string;
  rancho: string;
  productor: string;
  sanitario: string;
  pruebas?: { fecha: string; tuberculosis: string; brucelosis: string; mvz: string; resultado: string }[];
  cuarentenas?: { inicio: string; motivo: string; estado: string }[];
  exportaciones?: { solicitud: string; fecha: string; destino: string; estado: string }[];
}

export const bovinos: Bovino[] = [
  {
    id: 1, arete: "MX-4521-8890", sexo: "Macho", raza: "Hereford", peso: 450, nacimiento: "2021-03-15", rancho: "El Potrero", productor: "Juan Perez", sanitario: "Limpio",
    pruebas: [
      { fecha: "2024-08-10", tuberculosis: "Negativo", brucelosis: "Negativo", mvz: "MVZ. Ana Garcia", resultado: "Aprobado" },
      { fecha: "2024-05-22", tuberculosis: "Negativo", brucelosis: "Negativo", mvz: "MVZ. Roberto Diaz", resultado: "Aprobado" },
    ],
    cuarentenas: [],
    exportaciones: [
      { solicitud: "EXP-2024-0892", fecha: "2024-08-12", destino: "Estados Unidos", estado: "En proceso" },
    ],
  },
  { id: 2, arete: "MX-4521-8891", sexo: "Hembra", raza: "Angus", peso: 380, nacimiento: "2022-01-20", rancho: "El Potrero", productor: "Juan Perez", sanitario: "Limpio" },
  { id: 3, arete: "MX-4521-8892", sexo: "Macho", raza: "Charolais", peso: 520, nacimiento: "2020-07-08", rancho: "El Potrero", productor: "Juan Perez", sanitario: "Cuarentena" },
  { id: 4, arete: "MX-6720-3345", sexo: "Hembra", raza: "Brahman", peso: 410, nacimiento: "2021-11-22", rancho: "San Miguel", productor: "Pedro Gomez", sanitario: "Limpio" },
  { id: 5, arete: "MX-6720-3346", sexo: "Macho", raza: "Simmental", peso: 490, nacimiento: "2020-05-10", rancho: "San Miguel", productor: "Pedro Gomez", sanitario: "Limpio" },
  { id: 6, arete: "MX-8901-1120", sexo: "Hembra", raza: "Hereford", peso: 360, nacimiento: "2022-09-03", rancho: "La Esperanza", productor: "Roberto Hernandez", sanitario: "Reactor" },
  { id: 7, arete: "MX-8901-1121", sexo: "Macho", raza: "Angus", peso: 470, nacimiento: "2021-06-18", rancho: "La Esperanza", productor: "Roberto Hernandez", sanitario: "Limpio" },
  { id: 8, arete: "MX-8901-1122", sexo: "Hembra", raza: "Beefmaster", peso: 395, nacimiento: "2022-02-14", rancho: "Los Alamos", productor: "Roberto Hernandez", sanitario: "Limpio" },
];