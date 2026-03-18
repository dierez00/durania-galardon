"use client";

import { ShieldAlert, CalendarRange } from "lucide-react";
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
import type { AdminCuarentenasFiltersState } from "@/modules/cuarentenas/admin/domain/entities/AdminCuarentenaEntity";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "active",    label: "Activa" },
  { value: "released",  label: "Liberada" },
  { value: "suspended", label: "Suspendida" },
];

const TYPE_OPTIONS: FilterOption[] = [
  { value: "state",       label: "Estatal" },
  { value: "operational", label: "Operacional" },
];

const STATUS_LABELS: Record<string, string> = {
  active:    "Activa",
  released:  "Liberada",
  suspended: "Suspendida",
};

const TYPE_LABELS: Record<string, string> = {
  state:       "Estatal",
  operational: "Operacional",
};

function statusColor(value: string): string {
  if (value === "active")    return "text-red-600";
  if (value === "released")  return "text-emerald-600";
  if (value === "suspended") return "text-orange-500";
  return "";
}

/** Convierte un Date a "YYYY-MM-DD" usando la hora local */
function toIso(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parsea "YYYY-MM-DD" como medianoche en hora local */
function fromIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

const fmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

interface Props {
  filters: AdminCuarentenasFiltersState;
  onChange: (filters: AdminCuarentenasFiltersState) => void;
}

export function AdminCuarentenasFilters({ filters, onChange }: Readonly<Props>) {
  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.quarantineType || filters.dateFrom || filters.dateTo,
  );

  const dateRangeValue: DateRangeValue | undefined =
    filters.dateFrom || filters.dateTo
      ? { from: fromIso(filters.dateFrom), to: fromIso(filters.dateTo) }
      : undefined;

  const handleDateRangeChange = (range: DateRangeValue | undefined) => {
    onChange({ ...filters, dateFrom: toIso(range?.from), dateTo: toIso(range?.to) });
  };

  const dateRangeBadgeLabel = (() => {
    if (filters.dateFrom && filters.dateTo)
      return `${fmt.format(fromIso(filters.dateFrom))} â€“ ${fmt.format(fromIso(filters.dateTo))}`;
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
            placeholder="Buscar por tÃ­tulo o rancho..."
            className="w-72"
          />
          <FilterSelect
            value={filters.status}
            onChange={(value) =>
              onChange({ ...filters, status: value === "__all__" ? "" : value })
            }
            options={STATUS_OPTIONS}
            placeholder="Todos los estados"
            icon={ShieldAlert}
            getOptionColor={statusColor}
            className="w-48"
          />
          <FilterSelect
            value={filters.quarantineType}
            onChange={(value) =>
              onChange({ ...filters, quarantineType: value === "__all__" ? "" : value })
            }
            options={TYPE_OPTIONS}
            placeholder="Todos los tipos"
            className="w-44"
          />
          <DateRangeFilter
            value={dateRangeValue}
            onChange={handleDateRangeChange}
            placeholder="Periodo de inicio"
            numberOfMonths={2}
          />
        </FiltersRow>

        {hasActiveFilters && (
          <ActiveFiltersIndicator
            onClearAll={() =>
              onChange({ search: "", status: "", quarantineType: "", dateFrom: "", dateTo: "" })
            }
          >
            {filters.search && (
              <FilterBadge
                label="BÃºsqueda"
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
            {filters.quarantineType && (
              <FilterBadge
                label="Tipo"
                value={TYPE_LABELS[filters.quarantineType] ?? filters.quarantineType}
                onRemove={() => onChange({ ...filters, quarantineType: "" })}
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

