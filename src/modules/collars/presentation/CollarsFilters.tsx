"use client";

import { CircleUser, CalendarRange, Zap } from "lucide-react";
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
import type { CollarsFiltersState, ProducerListItem } from "./types";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "inactive", label: "Inactivo (sin asignar)" },
  { value: "active", label: "Activo (en productor)" },
  { value: "linked", label: "Vinculado (en animal)" },
  { value: "unlinked", label: "Desvinculado (disponible)" },
  { value: "suspended", label: "Suspendido (bloqueado)" },
  { value: "retired", label: "Retirado (fuera de servicio)" },
];

const STATUS_LABELS: Record<string, string> = {
  inactive: "Inactivo",
  active: "Activo",
  linked: "Vinculado",
  unlinked: "Desvinculado",
  suspended: "Suspendido",
  retired: "Retirado",
};

function statusColor(value: string): string {
  if (value === "active") return "text-success";
  if (value === "linked") return "text-info";
  if (value === "inactive") return "text-tone-neutral";
  if (value === "unlinked") return "text-warning";
  if (value === "suspended") return "text-destructive";
  if (value === "retired") return "text-tone-neutral";
  return "";
}

function toIso(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromIso(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

const fmt = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

interface Props {
  filters: CollarsFiltersState;
  onChange: (filters: CollarsFiltersState) => void;
  producers?: ProducerListItem[];
  showProducerSelect?: boolean;
  loadingProducers?: boolean;
}

export function CollarsFilters({
  filters,
  onChange,
  producers = [],
  showProducerSelect = true,
  loadingProducers: _loadingProducers = false,
}: Readonly<Props>) {
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.status ||
      filters.firmware ||
      filters.productor_id ||
      filters.dateFrom ||
      filters.dateTo
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
      return `${fmt.format(fromIso(filters.dateFrom))} – ${fmt.format(
        fromIso(filters.dateTo)
      )}`;
    }
    if (filters.dateFrom)
      return `Desde ${fmt.format(fromIso(filters.dateFrom))}`;
    if (filters.dateTo) return `Hasta ${fmt.format(fromIso(filters.dateTo))}`;
    return "";
  })();

  const producerOptions: FilterOption[] = [
    ...producers.map((p) => ({
      value: p.id,
      label: p.full_name,
    })),
  ];

  const firmwareOptions: FilterOption[] = [
    { value: "1.0.0", label: "1.0.0" },
    { value: "1.1.0", label: "1.1.0" },
    { value: "2.0.0", label: "2.0.0" },
  ];

  const selectedProducer = producers.find((p) => p.id === filters.productor_id);

  return (
    <FiltersLayout>
      <FiltersContainer>
        <FiltersRow>
          <SearchBar
            value={filters.search}
            onChange={(value) => onChange({ ...filters, search: value })}
            placeholder="Buscar por Collar ID..."
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
          {showProducerSelect && (
            <FilterSelect
              value={filters.productor_id}
              onChange={(value) =>
                onChange({
                  ...filters,
                  productor_id: value === "__all__" ? "" : value,
                })
              }
              options={producerOptions}
              placeholder="Todos los productores"
              icon={CircleUser}
              className="w-64"
            />
          )}
          <FilterSelect
            value={filters.firmware}
            onChange={(value) =>
              onChange({ ...filters, firmware: value === "__all__" ? "" : value })
            }
            options={firmwareOptions}
            placeholder="Todos los firmware"
            icon={Zap}
            className="w-48"
          />
          <DateRangeFilter
            value={dateRangeValue}
            onChange={handleDateRangeChange}
            placeholder="Periodo de vinculación"
            numberOfMonths={2}
          />
        </FiltersRow>

        {hasActiveFilters && (
          <ActiveFiltersIndicator
            onClearAll={() =>
              onChange({
                search: "",
                status: "",
                firmware: "",
                productor_id: "",
                dateFrom: "",
                dateTo: "",
              })
            }
          >
            {filters.search && (
              <FilterBadge
                label="Búsqueda"
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
            {filters.firmware && (
              <FilterBadge
                label="Firmware"
                value={filters.firmware}
                onRemove={() => onChange({ ...filters, firmware: "" })}
              />
            )}
            {filters.productor_id && selectedProducer && (
              <FilterBadge
                label="Productor"
                value={selectedProducer.full_name}
                onRemove={() => onChange({ ...filters, productor_id: "" })}
              />
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <FilterBadge
                icon={CalendarRange}
                label="Período"
                value={dateRangeBadgeLabel}
                onRemove={() =>
                  onChange({ ...filters, dateFrom: "", dateTo: "" })
                }
              />
            )}
          </ActiveFiltersIndicator>
        )}
      </FiltersContainer>
    </FiltersLayout>
  );
}
