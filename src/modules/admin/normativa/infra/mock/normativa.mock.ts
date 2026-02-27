import type { NormativaSetting } from "@/modules/admin/normativa/domain/entities/NormativaSettingEntity";

export const normativaMock: NormativaSetting[] = [
  {
    id: "norm-1",
    key: "rule_60",
    value_json: { percentage: 0.6 },
    effective_from: "2024-01-01T00:00:00Z",
    effective_until: null,
    status: "active",
  },
  {
    id: "norm-2",
    key: "max_export_heads",
    value_json: { limit: 500 },
    effective_from: "2024-06-01T00:00:00Z",
    effective_until: null,
    status: "active",
  },
  {
    id: "norm-3",
    key: "quarantine_days",
    value_json: { days: 30 },
    effective_from: "2023-01-01T00:00:00Z",
    effective_until: "2024-01-01T00:00:00Z",
    status: "expired",
  },
];
