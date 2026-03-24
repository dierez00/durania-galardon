import type { AdminMvz } from "@/modules/admin/mvz/domain/entities/AdminMvzEntity";

export const adminMvzMock: AdminMvz[] = [
  {
    id: "mvz-1",
    user_id: "usr-101",
    full_name: "Dr. Carlos Mendez",
    license_number: "CHIH-MVZ-0012",
    status: "active",
    assignedUpps: 5,
    registeredTests: 142,
    created_at: "2023-04-01T00:00:00Z",
  },
  {
    id: "mvz-2",
    user_id: "usr-102",
    full_name: "Dra. Ana Reyes",
    license_number: "CHIH-MVZ-0031",
    status: "active",
    assignedUpps: 3,
    registeredTests: 89,
    created_at: "2023-06-15T00:00:00Z",
  },
  {
    id: "mvz-3",
    user_id: "usr-103",
    full_name: "Dr. Luis Vega",
    license_number: "CHIH-MVZ-0045",
    status: "inactive",
    assignedUpps: 0,
    registeredTests: 23,
    created_at: "2022-09-10T00:00:00Z",
  },
];
