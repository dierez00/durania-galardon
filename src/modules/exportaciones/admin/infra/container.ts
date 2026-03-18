import { AdminExportacionesApiRepository } from "./api/adminExportacionesApi";
import { ApiAdminExportacionDetailRepository } from "./api/ApiAdminExportacionDetailRepository";
import { ListAdminExportaciones } from "../application/use-cases/listAdminExportaciones";
import { GetAdminExportacionDetail } from "../application/use-cases/GetAdminExportacionDetail";
import { GetAdminExportacionAnimales } from "../application/use-cases/GetAdminExportacionAnimales";
import { GetAdminExportacionAnimal } from "../application/use-cases/GetAdminExportacionAnimal";
import { UpdateAdminExportacionStatus } from "../application/use-cases/UpdateAdminExportacionStatus";

const listRepo = new AdminExportacionesApiRepository();
const detailRepo = new ApiAdminExportacionDetailRepository();

export const listExportacionesUseCase = new ListAdminExportaciones(listRepo);
export const getExportacionDetailUseCase = new GetAdminExportacionDetail(detailRepo);
export const getExportacionAnimalesUseCase = new GetAdminExportacionAnimales(detailRepo);
export const getExportacionAnimalUseCase = new GetAdminExportacionAnimal(detailRepo);
export const updateExportacionStatusUseCase = new UpdateAdminExportacionStatus(detailRepo);
