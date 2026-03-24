"use client";

import { CircleUser, CalendarRange } from "lucide-react";
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
import type { AdminProductoresFiltersState } from "@/modules/admin/productores/domain/entities/AdminProductorEntity";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "active",   label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

const STATUS_LABELS: Record<string, string> = {
  active:   "Activo",
  inactive: "Inactivo",
};

function statusColor(value: string): string {
  if (value === "active")   return "text-success";
  if (value === "inactive") return "text-tone-neutral";
  return "";
}

/** Convierte un Date a "YYYY-MM-DD" usando la hora local (evita desfase UTC) */
function toIso(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parsea "YYYY-MM-DD" como medianoche en hora local (evita desfase UTC) */
function fromIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

const fmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

interface Props {
  filters: AdminProductoresFiltersState;
  onChange: (filters: AdminProductoresFiltersState) => void;
}

export function AdminProductoresFilters({ filters, onChange }: Readonly<Props>) {
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
      return `${fmt.format(fromIso(filters.dateFrom))} – ${fmt.format(fromIso(filters.dateTo))}`;
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
            placeholder="Buscar por nombre o CURP..."
            className="w-72"
          />
          <FilterSelect
            value={filters.status}
            onChange={(value) =>
              onChange({ ...filters, status: value === "__all__" ? "" : value })
            }
            options={STATUS_OPTIONS}
            placeholder="Todos los estados"
            icon={CircleUser}
            getOptionColor={statusColor}
            className="w-48"
          />
          <DateRangeFilter
            value={dateRangeValue}
            onChange={handleDateRangeChange}
            placeholder="Periodo de registro"
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
