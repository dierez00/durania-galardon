/**
 * Punto de ensamblado del hexágono admin/productores.
 *
 * Solo este archivo conoce AdminProductoresApiRepository (implementación concreta).
 * Toda la presentación accede a los casos de uso a través de este módulo.
 */
import { AdminProductoresApiRepository } from "./api/adminProductoresApi";
import { ListAdminProductores } from "../application/use-cases/listAdminProductores";
import { CreateAdminProductor } from "../application/use-cases/CreateAdminProductor";

const repository = new AdminProductoresApiRepository();

export const listProductoresUseCase = new ListAdminProductores(repository);
export const createProductorUseCase = new CreateAdminProductor(repository);
