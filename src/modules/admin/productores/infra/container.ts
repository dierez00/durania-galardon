import { CreateAdminProductor } from "../application/use-cases/CreateAdminProductor";
import { CreateAdminProductoresBatch } from "../application/use-cases/CreateAdminProductoresBatch";
import { ListAdminProductores } from "../application/use-cases/listAdminProductores";
import { AdminProductoresApiRepository } from "./api/adminProductoresApi";

const repository = new AdminProductoresApiRepository();

export const listProductoresUseCase = new ListAdminProductores(repository);
export const createProductorUseCase = new CreateAdminProductor(repository);
export const createProductoresBatchUseCase = new CreateAdminProductoresBatch(repository);
