import { CreateAdminMvzBatch } from "../application/use-cases/CreateAdminMvzBatch";
import { ListAdminMvz } from "../application/use-cases/listAdminMvz";
import { AdminMvzApiRepository } from "./api/adminMvzApi";
import { ApiAdminMvzDetailRepository } from "./api/ApiAdminMvzDetailRepository";
import { GetAdminMvzDetailUseCase } from "../application/use-cases/GetAdminMvzDetail";
import { GetAdminMvzUppsUseCase } from "../application/use-cases/GetAdminMvzUpps";
import { GetAdminMvzAvailableUppsUseCase } from "../application/use-cases/GetAdminMvzAvailableUpps";
import { AssignMvzUppUseCase } from "../application/use-cases/AssignMvzUpp";
import { UnassignMvzUppUseCase } from "../application/use-cases/UnassignMvzUpp";
import { GetAdminMvzTestsUseCase } from "../application/use-cases/GetAdminMvzTests";
import { GetAdminMvzVisitsUseCase } from "../application/use-cases/GetAdminMvzVisits";
import {
  UpdateAdminMvzStatusUseCase,
  DeleteAdminMvzUseCase,
} from "../application/use-cases/AdminMvzStatusActions";
import { UpdateAdminMvzInfoUseCase } from "../application/use-cases/UpdateAdminMvzInfo";

const repository = new AdminMvzApiRepository();
const detailRepository = new ApiAdminMvzDetailRepository();

export const listAdminMvzUseCase = new ListAdminMvz(repository);
export const createAdminMvzBatchUseCase = new CreateAdminMvzBatch(repository);

export const getMvzDetailUseCase = new GetAdminMvzDetailUseCase(detailRepository);
export const getMvzUppsUseCase = new GetAdminMvzUppsUseCase(detailRepository);
export const getAvailableMvzUppsUseCase = new GetAdminMvzAvailableUppsUseCase(detailRepository);
export const assignMvzUppUseCase = new AssignMvzUppUseCase(detailRepository);
export const unassignMvzUppUseCase = new UnassignMvzUppUseCase(detailRepository);
export const getMvzTestsUseCase = new GetAdminMvzTestsUseCase(detailRepository);
export const getMvzVisitsUseCase = new GetAdminMvzVisitsUseCase(detailRepository);
export const updateMvzStatusUseCase = new UpdateAdminMvzStatusUseCase(detailRepository);
export const updateMvzInfoUseCase = new UpdateAdminMvzInfoUseCase(detailRepository);
export const deleteMvzUseCase = new DeleteAdminMvzUseCase(detailRepository);
