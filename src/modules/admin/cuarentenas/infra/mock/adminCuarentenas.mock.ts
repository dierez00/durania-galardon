import type { AdminCuarentena } from "@/modules/admin/cuarentenas/domain/entities/AdminCuarentenaEntity";

export const adminCuarentenasMock: AdminCuarentena[] = [
  {
    id: "cuar-1",
    title: "Cuarentena TB Zona Norte",
    upp_id: "upp-001",
    status: "active",
    quarantine_type: "state",
    started_at: "2025-11-01T00:00:00Z",
  },
  {
    id: "cuar-2",
    title: "Cuarentena Brucelosis Delicias",
    upp_id: "upp-004",
    status: "active",
    quarantine_type: "federal",
    started_at: "2025-12-15T00:00:00Z",
  },
  {
    id: "cuar-3",
    title: "Cuarentena Preventiva Parral",
    upp_id: null,
    status: "released",
    quarantine_type: "state",
    started_at: "2025-08-20T00:00:00Z",
  },
];
