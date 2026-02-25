export interface CreatePruebaDTO {
  fecha: string;
  mvzId: string;
  supervisor: string;
  lugar: string;
  motivo: string;
  bovinosEvaluar: number;
  observaciones?: string;
}
