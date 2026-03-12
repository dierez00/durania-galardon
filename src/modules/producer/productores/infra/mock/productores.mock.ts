import type { Productor } from "../../domain/entities/ProductoresEntity";

export const productoresMock: Productor[] = [
  { id: 1, nombre: "Juan Perez Ramirez",    curp: "PERJ800515HCHRM09", rfc: "PERJ800515XX1", municipio: "Chihuahua",   ranchos: 3, bovinos: 245, estado: "Activo",   fechaRegistro: "2023-03-10" },
  { id: 2, nombre: "Pedro Gomez Torres",    curp: "GOTP750320HCHM08",  rfc: "GOTP750320YY2", municipio: "Delicias",    ranchos: 2, bovinos: 180, estado: "Activo",   fechaRegistro: "2023-05-22" },
  { id: 3, nombre: "Miguel Angel Ruiz",     curp: "RUIM880910HCHR05",  rfc: "RUIM880910ZZ3", municipio: "Cuauhtemoc", ranchos: 1, bovinos: 95,  estado: "Activo",   fechaRegistro: "2023-07-14" },
  { id: 4, nombre: "Roberto Hernandez",     curp: "HERR700101HCHR06",  rfc: "HERR700101AA4", municipio: "Juarez",     ranchos: 4, bovinos: 520, estado: "Activo",   fechaRegistro: "2022-11-03" },
  { id: 5, nombre: "Francisco Lopez Mendez",curp: "LOMF650825HCHL07",  rfc: "LOMF650825BB5", municipio: "Parral",     ranchos: 2, bovinos: 310, estado: "Inactivo", fechaRegistro: "2022-08-18" },
  { id: 6, nombre: "Alberto Castillo Vega", curp: "CAVA720415HCHV08",  rfc: "CAVA720415CC6", municipio: "Camargo",    ranchos: 1, bovinos: 78,  estado: "Activo",   fechaRegistro: "2024-01-09" },
];
