import type { Rancho } from "@/modules/ranchos/domain/entities/RanchosEntity";

export const ranchosMock: Rancho[] = [
  { id: 1, nombre: "Rancho El Potrero",    productor: "Juan Perez Ramirez",     municipio: "Chihuahua", localidad: "El Sauz",         coords: "28.6353, -106.0889", bovinos: 120, estado: "Activo",   fechaRegistro: "2022-04-12" },
  { id: 2, nombre: "Rancho Las Palmas",    productor: "Juan Perez Ramirez",     municipio: "Chihuahua", localidad: "Aldama Centro",   coords: "28.8401, -105.9151", bovinos: 85,  estado: "Activo",   fechaRegistro: "2022-07-03" },
  { id: 3, nombre: "Rancho San Miguel",    productor: "Pedro Gomez Torres",     municipio: "Delicias",  localidad: "Km 42",           coords: "28.1870, -105.4714", bovinos: 95,  estado: "Activo",   fechaRegistro: "2023-01-18" },
  { id: 4, nombre: "Rancho La Esperanza",  productor: "Roberto Hernandez",      municipio: "Juarez",    localidad: "Samalayuca",      coords: "31.3456, -106.4437", bovinos: 210, estado: "Activo",   fechaRegistro: "2021-11-25" },
  { id: 5, nombre: "Rancho Los Alamos",    productor: "Roberto Hernandez",      municipio: "Juarez",    localidad: "Praxedis",        coords: "31.3689, -106.0210", bovinos: 165, estado: "Activo",   fechaRegistro: "2023-06-09" },
  { id: 6, nombre: "Hacienda Santa Rosa",  productor: "Francisco Lopez Mendez", municipio: "Parral",    localidad: "Villa Matamoros", coords: "26.9320, -105.6619", bovinos: 310, estado: "Inactivo", fechaRegistro: "2020-09-30" },
];
