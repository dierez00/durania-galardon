"use client";

import React from "react";
import { Search, Clock, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  FiltersLayout,
  FiltersContainer,
  FiltersRow,
  FiltersGroup,
  SearchBar,
  FilterSelect,
  FilterBadge,
  ActiveFiltersIndicator,
  ActionButtons,
  DateRangeFilter,
  type FilterOption,
  type ActionButtonConfig,
} from "@/shared/ui/filters/index";
import type { CuarentenasFiltersState } from "@/modules/cuarentenas/domain/entities/CuarentenasEntity";

interface CuarentenasFiltersProps {
  readonly filters: CuarentenasFiltersState;
  readonly onFiltersChange: (next: CuarentenasFiltersState) => void;
  readonly onAddCuarentena?: () => void;
}

const estadoOptions: FilterOption[] = [
  { value: "Activa",     label: "Activa" },
  { value: "Completada", label: "Completada" },
];

const getEstadoIcon = (value: string): LucideIcon => {
  if (value === "Activa")     return Clock;
  if (value === "Completada") return ShieldAlert;
  return Clock;
};

const getEstadoColor = (value: string): string => {
  if (value === "Activa")     return "text-amber-600";
  if (value === "Completada") return "text-emerald-600";
  return "text-muted-foreground";
};

export const CuarentenasFilters: React.FC<CuarentenasFiltersProps> = ({
  filters,
  onFiltersChange,
  onAddCuarentena,
}) => {
  const set = <K extends keyof CuarentenasFiltersState>(
    key: K,
    value: CuarentenasFiltersState[K]
  ) => onFiltersChange({ ...filters, [key]: value });

  const clearAll = () =>
    onFiltersChange({ search: "", estado: "", fechaDesde: "", fechaHasta: "" });

  const hasActiveFilters = !!(
    filters.search || filters.estado || filters.fechaDesde || filters.fechaHasta
  );

  const actionButtons: ActionButtonConfig[] = onAddCuarentena
    ? [{ label: "Nueva Cuarentena", icon: ShieldAlert, onClick: onAddCuarentena, variant: "primary", title: "Registrar cuarentena" }]
    : [];

  return (
    <FiltersLayout>
      <FiltersContainer>
        {/* Fila 1: búsqueda + botones */}
        <FiltersRow>
          <SearchBar
            value={filters.search}
            onChange={(v) => set("search", v)}
            placeholder="Buscar por arete, rancho o MVZ..."
          />
          {actionButtons.length > 0 && <ActionButtons buttons={actionButtons} />}
        </FiltersRow>

        {/* Fila 2: selects y rango de fechas */}
        <FiltersGroup>
          <FilterSelect
            value={filters.estado}
            onChange={(v) => set("estado", v)}
            options={estadoOptions}
            icon={getEstadoIcon(filters.estado)}
            placeholder="Todos los estados"
            getOptionColor={getEstadoColor}
          />
          <DateRangeFilter
            startDate={filters.fechaDesde}
            endDate={filters.fechaHasta}
            onStartDateChange={(v) => set("fechaDesde", v)}
            onEndDateChange={(v) => set("fechaHasta", v)}
            startPlaceholder="Inicio desde"
            endPlaceholder="Inicio hasta"
          />
        </FiltersGroup>
      </FiltersContainer>

      {/* Banda de filtros activos */}
      {hasActiveFilters && (
        <ActiveFiltersIndicator onClearAll={clearAll}>
          {filters.search && (
            <FilterBadge
              icon={Search}
              label="Búsqueda"
              value={filters.search}
              onRemove={() => set("search", "")}
              colorClass="bg-blue-100 text-blue-700"
            />
          )}
          {filters.estado && (
            <FilterBadge
              icon={getEstadoIcon(filters.estado)}
              label="Estado"
              value={filters.estado}
              onRemove={() => set("estado", "")}
              colorClass={filters.estado === "Activa" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}
            />
          )}
          {filters.fechaDesde && (
            <FilterBadge
              label="Inicio desde"
              value={filters.fechaDesde}
              onRemove={() => set("fechaDesde", "")}
              colorClass="bg-sky-100 text-sky-700"
            />
          )}
          {filters.fechaHasta && (
            <FilterBadge
              label="Inicio hasta"
              value={filters.fechaHasta}
              onRemove={() => set("fechaHasta", "")}
              colorClass="bg-sky-100 text-sky-700"
            />
          )}
        </ActiveFiltersIndicator>
      )}
    </FiltersLayout>
  );
};
