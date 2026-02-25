import type { Cuarentena, CuarentenasFiltersState } from "../../domain/entities/CuarentenasEntity";
import type { CuarentenasRepository } from "../../domain/repositories/cuarentenasRepository";
import { filterCuarentenas } from "../../domain/services/filterCuarentenas";

export function listCuarentenas(repo: CuarentenasRepository): Cuarentena[] {
  return repo.list();
}

export function filterCuarentenasUseCase(
  cuarentenas: Cuarentena[],
  filters: CuarentenasFiltersState
): Cuarentena[] {
  return filterCuarentenas(cuarentenas, filters);
}

