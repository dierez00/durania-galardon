import type { Rancho } from "../../domain/entities/RanchosEntity";
import type { RanchosRepository } from "../../domain/repositories/ranchosRepository";
import { ranchosMock } from "./ranchos.mock";

export class MockRanchosRepository implements RanchosRepository {
  constructor(private readonly items: Rancho[] = ranchosMock) {}

  list(): Rancho[] {
    return [...this.items];
  }
}

export const mockRanchosRepository = new MockRanchosRepository();
export { ranchosMock };

