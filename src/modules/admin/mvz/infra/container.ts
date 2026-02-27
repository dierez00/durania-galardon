import { CreateAdminMvzBatch } from "../application/use-cases/CreateAdminMvzBatch";
import { ListAdminMvz } from "../application/use-cases/listAdminMvz";
import { AdminMvzApiRepository } from "./api/adminMvzApi";

const repository = new AdminMvzApiRepository();

export const listAdminMvzUseCase = new ListAdminMvz(repository);
export const createAdminMvzBatchUseCase = new CreateAdminMvzBatch(repository);
