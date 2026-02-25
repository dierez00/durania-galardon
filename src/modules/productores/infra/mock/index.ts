import type { Productor } from "../../domain/entities/ProductoresEntity";
import type { ProductoresRepository } from "../../domain/repositories/productoresRepository";
import { productoresMock } from "./productores.mock";

export class MockProductoresRepository implements ProductoresRepository {
  constructor(private readonly items: Productor[] = productoresMock) {}

  list(): Productor[] {
    return [...this.items];
  }
}

export const mockProductoresRepository = new MockProductoresRepository();
export { productoresMock };

