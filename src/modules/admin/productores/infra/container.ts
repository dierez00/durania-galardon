import { CreateAdminProductor } from "../application/use-cases/CreateAdminProductor";
import { CreateAdminProductoresBatch } from "../application/use-cases/CreateAdminProductoresBatch";
import { ListAdminProductores } from "../application/use-cases/listAdminProductores";
import { AdminProductoresApiRepository } from "./api/adminProductoresApi";
import { ApiAdminProductorDetailRepository } from "./api/ApiAdminProductorDetailRepository";
import { GetAdminProductorDetailUseCase } from "../application/use-cases/GetAdminProductorDetail";
import { GetAdminProductorUppsUseCase } from "../application/use-cases/GetAdminProductorUpps";
import { GetAdminProductorDocumentsUseCase } from "../application/use-cases/GetAdminProductorDocuments";
import { GetAdminProductorVisitsUseCase } from "../application/use-cases/GetAdminProductorVisits";
import {
  UpdateAdminProductorStatusUseCase,
  DeleteAdminProductorUseCase,
} from "../application/use-cases/AdminProductorStatusActions";
import { UpdateAdminProductorInfoUseCase } from "../application/use-cases/UpdateAdminProductorInfo";

const repository = new AdminProductoresApiRepository();
const detailRepository = new ApiAdminProductorDetailRepository();

export const listProductoresUseCase = new ListAdminProductores(repository);
export const createProductorUseCase = new CreateAdminProductor(repository);
export const createProductoresBatchUseCase = new CreateAdminProductoresBatch(repository);

export const getProductorDetailUseCase = new GetAdminProductorDetailUseCase(detailRepository);
export const getProductorUppsUseCase = new GetAdminProductorUppsUseCase(detailRepository);
export const getProductorDocumentsUseCase = new GetAdminProductorDocumentsUseCase(detailRepository);
export const getProductorVisitsUseCase = new GetAdminProductorVisitsUseCase(detailRepository);
export const updateProductorStatusUseCase = new UpdateAdminProductorStatusUseCase(detailRepository);
export const updateProductorInfoUseCase = new UpdateAdminProductorInfoUseCase(detailRepository);
export const deleteProductorUseCase = new DeleteAdminProductorUseCase(detailRepository);
