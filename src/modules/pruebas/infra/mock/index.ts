import type { PruebaSanitaria } from "../../domain/entities/PruebasEntity";
import type { PruebasRepository } from "../../domain/repositories/pruebasRepository";
import { pruebasMock } from "./pruebas.mock";

export class MockPruebasRepository implements PruebasRepository {
  constructor(private readonly items: PruebaSanitaria[] = pruebasMock) {}

  list(): PruebaSanitaria[] {
    return [...this.items];
  }
}

export const mockPruebasRepository = new MockPruebasRepository();
export { pruebasMock } from "./pruebas.mock";

