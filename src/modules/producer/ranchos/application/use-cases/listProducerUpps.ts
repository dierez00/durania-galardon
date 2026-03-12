import type { IProducerUppsRepository, ListProducerUppsParams, ListProducerUppsResult } from "../../domain/repositories/producerUppsRepository";

export class ListProducerUpps {
  constructor(private readonly repository: IProducerUppsRepository) {}

  execute(params: ListProducerUppsParams): Promise<ListProducerUppsResult> {
    return this.repository.list(params);
  }
}
