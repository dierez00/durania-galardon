import type { ProducerUpp } from "../entities/ProducerUppEntity";

export interface ListProducerUppsParams {
  search?: string;
  status?: string;
}

export interface ListProducerUppsResult {
  upps: ProducerUpp[];
}

export interface IProducerUppsRepository {
  list(params: ListProducerUppsParams): Promise<ListProducerUppsResult>;
  getById(id: string): Promise<ProducerUpp | null>;
}
