export interface CreateBovinoDTO {
  arete: string;
  sexo: "Macho" | "Hembra";
  raza: string;
  peso: number;
  nacimiento: string;
  rancho: string;
  productor: string;
}
