import type { AdminCuarentena } from "@/modules/admin/cuarentenas/domain/entities/AdminCuarentenaEntity";

export const adminCuarentenasMock: AdminCuarentena[] = [
  {
    id: "cuar-1",
    title: "Cuarentena TB Zona Norte",
    uppId: "upp-001",
    uppName: "Rancho El Sabino",
    producerName: "Juan Pérez",
    status: "active",
    quarantineType: "state",
    startedAt: "2025-11-01T00:00:00Z",
    releasedAt: null,
  },
  {
    id: "cuar-2",
    title: "Cuarentena Brucelosis Delicias",
    uppId: "upp-004",
    uppName: "Rancho Los Álamos",
    producerName: "María González",
    status: "active",
    quarantineType: "operational",
    startedAt: "2025-12-15T00:00:00Z",
    releasedAt: null,
  },
  {
    id: "cuar-3",
    title: "Cuarentena Preventiva Parral",
    uppId: null,
    uppName: null,
    producerName: null,
    status: "released",
    quarantineType: "state",
    startedAt: "2025-08-20T00:00:00Z",
    releasedAt: "2025-10-01T00:00:00Z",
  },
];
