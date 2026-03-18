import { ListAdminCuarentenas } from "../application/use-cases/listAdminCuarentenas";
import { CreateAdminCuarentena } from "../application/use-cases/CreateAdminCuarentena";
import { GetAdminCuarentenaMapPoints } from "../application/use-cases/GetAdminCuarentenaMapPoints";
import { GetAdminCuarentenaActivationContext } from "../application/use-cases/GetAdminCuarentenaActivationContext";
import { GetAdminCuarentenaDetail } from "../application/use-cases/GetAdminCuarentenaDetail";
import { UpdateAdminCuarentenaStatusUseCase } from "../application/use-cases/AdminCuarentenaStatusActions";
import { UpdateAdminCuarentenaInfoUseCase } from "../application/use-cases/UpdateAdminCuarentenaInfo";
import { AdminCuarentenasApiRepository } from "./api/adminCuarentenasApi";
import { ApiAdminCuarentenaDetailRepository } from "./api/ApiAdminCuarentenaDetailRepository";

const repository       = new AdminCuarentenasApiRepository();
const detailRepository = new ApiAdminCuarentenaDetailRepository();

export const listCuarentenasUseCase            = new ListAdminCuarentenas(repository);
export const createCuarentenaUseCase           = new CreateAdminCuarentena(repository);
export const getMapPointsUseCase               = new GetAdminCuarentenaMapPoints(repository);
export const getActivationContextUseCase       = new GetAdminCuarentenaActivationContext(repository);
export const getCuarentenaDetailUseCase        = new GetAdminCuarentenaDetail(detailRepository);
export const updateCuarentenaStatusUseCase     = new UpdateAdminCuarentenaStatusUseCase(detailRepository);
export const updateCuarentenaInfoUseCase       = new UpdateAdminCuarentenaInfoUseCase(detailRepository);
