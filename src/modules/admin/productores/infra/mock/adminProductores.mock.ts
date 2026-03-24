import type { AdminProductor } from "@/modules/admin/productores/domain/entities/AdminProductorEntity";

export const adminProductoresMock: AdminProductor[] = [
  {
    id: "prod-1",
    full_name: "Juan Perez Ramirez",
    curp: "PERJ800515HCHRM09",
    status: "active",
    created_at: "2023-03-10T00:00:00Z",
    documents: { validated: 3, pending: 1, expired: 0 },
  },
  {
    id: "prod-2",
    full_name: "Pedro Gomez Torres",
    curp: "GOTP750320HCHM08",
    status: "active",
    created_at: "2023-05-22T00:00:00Z",
    documents: { validated: 2, pending: 0, expired: 1 },
  },
  {
    id: "prod-3",
    full_name: "Roberto Hernandez",
    curp: "HERR700101HCHR06",
    status: "suspended",
    created_at: "2022-11-03T00:00:00Z",
    documents: { validated: 1, pending: 2, expired: 0 },
  },
];
