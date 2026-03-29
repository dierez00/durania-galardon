import {
  apiFetchAllCollars,
  apiFetchAdminCollarDetail,
  apiFetchCollarHistory,
  apiProvisionCollar,
  apiUpdateAdminCollar,
} from "@/modules/collars/infra/api/collaresApi";
import type {
  AdminEditableCollarStatus,
  AdminUpdateCollarDTO,
} from "@/modules/collars/application/dto";
import type {
  CollarsFiltersState,
  CollarSortState,
  CollarListItem,
  CollarDetail,
  CollarLinkHistory,
} from "@/modules/collars/presentation/types";

export interface AdminCollarsPageResult {
  collars: CollarListItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listAdminCollars(
  filters: CollarsFiltersState,
  limit: number,
  offset: number,
  sort: CollarSortState,
  producerId?: string
): Promise<AdminCollarsPageResult> {
  const response = await apiFetchAllCollars(
    {
      status: filters.status || undefined,
      search: filters.search || undefined,
      firmware: filters.firmware || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      producerId: producerId || undefined,
    },
    limit,
    offset,
    sort
  );

  return {
    collars: (response.collars ?? []) as CollarListItem[],
    total: response.total,
    limit: response.limit,
    offset: response.offset,
  };
}

export async function createAdminCollar(input: {
  collar_id: string;
  firmware_version?: string;
  producer_id?: string;
}): Promise<void> {
  await apiProvisionCollar(
    input.collar_id,
    input.firmware_version,
    undefined,
    input.producer_id
  );
}

export async function assignCollarToProducer(
  collarId: string,
  producerId: string
): Promise<void> {
  await updateAdminCollar(collarId, { producer_id: producerId });
}

export async function updateAdminCollarStatus(
  collarId: string,
  status: AdminEditableCollarStatus,
  notes?: string
): Promise<void> {
  await updateAdminCollar(collarId, { status, notes });
}

export async function updateAdminCollar(
  collarId: string,
  payload: AdminUpdateCollarDTO
): Promise<void> {
  await apiUpdateAdminCollar(collarId, payload);
}

export async function getAdminCollarDetail(collarId: string): Promise<{
  collar: CollarDetail | null;
  animal: { id: string; name: string } | null;
  producer: { id: string; fullName: string } | null;
}> {
  const data = (await apiFetchAdminCollarDetail(collarId)) as {
    collar?: CollarDetail | null;
    animal?: { id: string; name: string } | null;
    producer?: { id: string; fullName: string } | null;
  } | null;

  return {
    collar: data?.collar ?? null,
    animal: data?.animal ?? null,
    producer: data?.producer ?? null,
  };
}

export async function getCollarHistory(
  collarId: string
): Promise<{ history: CollarLinkHistory[]; total: number }> {
  const history = (await apiFetchCollarHistory(collarId)) as CollarLinkHistory[];
  return {
    history,
    total: history.length,
  };
}
