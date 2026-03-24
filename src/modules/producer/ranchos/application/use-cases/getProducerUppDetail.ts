import type { ProducerUpp } from "../../domain/entities/ProducerUppEntity";
import type { IProducerUppsRepository } from "../../domain/repositories/producerUppsRepository";

export class GetProducerUppDetail {
  constructor(private readonly repository: IProducerUppsRepository) {}

  execute(id: string): Promise<ProducerUpp | null> {
    return this.repository.getById(id);
  }
}
