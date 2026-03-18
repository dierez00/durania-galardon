"use client";

import { CalendarRange, FileText } from "lucide-react";
import {
  FiltersLayout,
  FiltersContainer,
  FiltersRow,
  SearchBar,
  FilterSelect,
  FilterBadge,
  ActiveFiltersIndicator,
  DateRangeFilter,
} from "@/shared/ui/filters";
import type { FilterOption, DateRangeValue } from "@/shared/ui/filters";
import type { AdminExportacionesFiltersState } from "@/modules/admin/exportaciones/domain/entities/AdminExportacionEntity";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "requested",      label: "Solicitada" },
  { value: "mvz_validated",  label: "Validada MVZ" },
  { value: "final_approved", label: "Aprobada" },
  { value: "blocked",        label: "Bloqueada" },
  { value: "rejected",       label: "Rechazada" },
];

const STATUS_LABELS: Record<string, string> = {
  requested:      "Solicitada",
  mvz_validated:  "Validada MVZ",
  final_approved: "Aprobada",
  blocked:        "Bloqueada",
  rejected:       "Rechazada",
};

function statusColor(value: string): string {
  if (value === "final_approved") return "text-emerald-600";
  if (value === "blocked")        return "text-orange-500";
  if (value === "rejected")       return "text-red-500";
  if (value === "mvz_validated")  return "text-amber-500";
  return "";
}

function toIso(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

const fmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

interface Props {
  filters: AdminExportacionesFiltersState;
  onChange: (filters: AdminExportacionesFiltersState) => void;
}

export function AdminExportacionesFilters({ filters, onChange }: Readonly<Props>) {
  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.dateFrom || filters.dateTo
  );

  const dateRangeValue: DateRangeValue | undefined =
    filters.dateFrom || filters.dateTo
      ? { from: fromIso(filters.dateFrom), to: fromIso(filters.dateTo) }
      : undefined;

  const handleDateRangeChange = (range: DateRangeValue | undefined) => {
    onChange({
      ...filters,
      dateFrom: toIso(range?.from),
      dateTo: toIso(range?.to),
    });
  };

  const dateRangeBadgeLabel = (() => {
    if (filters.dateFrom && filters.dateTo) {
      return `${fmt.format(fromIso(filters.dateFrom))} \u2013 ${fmt.format(fromIso(filters.dateTo))}`;
    }
    if (filters.dateFrom) return `Desde ${fmt.format(fromIso(filters.dateFrom))}`;
    if (filters.dateTo)   return `Hasta ${fmt.format(fromIso(filters.dateTo))}`;
    return "";
  })();

  return (
    <FiltersLayout>
      <FiltersContainer>
        <FiltersRow>
          <SearchBar
            value={filters.search}
            onChange={(value) => onChange({ ...filters, search: value })}
            placeholder="Buscar por UPP o productor..."
            className="w-72"
          />
          <FilterSelect
            value={filters.status}
            onChange={(value) =>
              onChange({ ...filters, status: value === "__all__" ? "" : value })
            }
            options={STATUS_OPTIONS}
            placeholder="Todos los estados"
            icon={FileText}
            getOptionColor={statusColor}
            className="w-48"
          />
          <DateRangeFilter
            value={dateRangeValue}
            onChange={handleDateRangeChange}
            placeholder="Periodo de solicitud"
            numberOfMonths={2}
          />
        </FiltersRow>

        {hasActiveFilters && (
          <ActiveFiltersIndicator
            onClearAll={() =>
              onChange({ search: "", status: "", dateFrom: "", dateTo: "" })
            }
          >
            {filters.search && (
              <FilterBadge
                label="Busqueda"
                value={filters.search}
                onRemove={() => onChange({ ...filters, search: "" })}
              />
            )}
            {filters.status && (
              <FilterBadge
                label="Estado"
                value={STATUS_LABELS[filters.status] ?? filters.status}
                onRemove={() => onChange({ ...filters, status: "" })}
              />
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <FilterBadge
                icon={CalendarRange}
                label="Periodo"
                value={dateRangeBadgeLabel}
                onRemove={() => onChange({ ...filters, dateFrom: "", dateTo: "" })}
              />
            )}
          </ActiveFiltersIndicator>
        )}
      </FiltersContainer>
    </FiltersLayout>
  );
}
