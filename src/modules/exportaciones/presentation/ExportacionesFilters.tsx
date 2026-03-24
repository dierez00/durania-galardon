"use client";

import React from "react";
import { Search, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
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
  DateRangeFilter,
  type FilterOption,
} from "@/shared/ui/filters/index";
import type { ExportacionesFiltersState } from "@/modules/exportaciones/domain/entities/ExportacionesEntity";

interface ExportacionesFiltersProps {
  readonly filters: ExportacionesFiltersState;
  readonly onFiltersChange: (next: ExportacionesFiltersState) => void;
}

const estadoOptions: FilterOption[] = [
  { value: "Aprobada",     label: "Aprobada" },
  { value: "En revision",  label: "En revision" },
  { value: "Pendiente",    label: "Pendiente" },
  { value: "Rechazada",    label: "Rechazada" },
];

const reactorOptions: FilterOption[] = [
  { value: "No", label: "No reactor" },
  { value: "Si", label: "Reactor" },
];

const getEstadoIcon = (value: string): LucideIcon => {
  if (value === "Aprobada")    return CheckCircle;
  if (value === "Rechazada")   return XCircle;
  if (value === "En revision") return ArrowRight;
  return Clock;
};

const getEstadoColor = (value: string): string => {
  if (value === "Aprobada") return "text-success";
  if (value === "Rechazada") return "text-error";
  if (value === "En revision") return "text-info";
  if (value === "Pendiente") return "text-warning";
  return "text-muted-foreground";
};

const getReactorColor = (value: string): string => {
  if (value === "Si") return "text-error";
  if (value === "No") return "text-success";
  return "text-muted-foreground";
};

export const ExportacionesFilters: React.FC<ExportacionesFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const set = <K extends keyof ExportacionesFiltersState>(
    key: K,
    value: ExportacionesFiltersState[K]
  ) => onFiltersChange({ ...filters, [key]: value });

  const clearAll = () =>
    onFiltersChange({ search: "", estado: "", reactor: "", fechaDesde: "", fechaHasta: "" });

  const hasActiveFilters = !!(
    filters.search || filters.estado || filters.reactor ||
    filters.fechaDesde || filters.fechaHasta
  );

  return (
    <FiltersLayout>
      <FiltersContainer>
        {/* Fila 1: búsqueda */}
        <FiltersRow>
          <SearchBar
            value={filters.search}
            onChange={(v) => set("search", v)}
            placeholder="Buscar por arete, productor, rancho o MVZ..."
          />
        </FiltersRow>

        {/* Fila 2: selects y fechas */}
        <FiltersGroup>
          <FilterSelect
            value={filters.estado}
            onChange={(v) => set("estado", v)}
            options={estadoOptions}
            icon={getEstadoIcon(filters.estado)}
            placeholder="Todos los estados"
            getOptionColor={getEstadoColor}
          />
          <FilterSelect
            value={filters.reactor}
            onChange={(v) => set("reactor", v)}
            options={reactorOptions}
            icon={filters.reactor === "Si" ? XCircle : CheckCircle}
            placeholder="Reactor / No reactor"
            getOptionColor={getReactorColor}
          />
          <DateRangeFilter
            startDate={filters.fechaDesde}
            endDate={filters.fechaHasta}
            onStartDateChange={(v) => set("fechaDesde", v)}
            onEndDateChange={(v) => set("fechaHasta", v)}
            startPlaceholder="Prueba desde"
            endPlaceholder="Prueba hasta"
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
              tone="info"
            />
          )}
          {filters.estado && (
            <FilterBadge
              icon={getEstadoIcon(filters.estado)}
              label="Estado"
              value={filters.estado}
              onRemove={() => set("estado", "")}
              tone={
                filters.estado === "Aprobada"
                  ? "success"
                  : filters.estado === "Rechazada"
                    ? "error"
                    : filters.estado === "En revision"
                      ? "info"
                      : "warning"
              }
            />
          )}
          {filters.reactor && (
            <FilterBadge
              icon={filters.reactor === "Si" ? XCircle : CheckCircle}
              label="Reactor"
              value={filters.reactor === "Si" ? "Reactor" : "No reactor"}
              onRemove={() => set("reactor", "")}
              tone={filters.reactor === "Si" ? "error" : "success"}
            />
          )}
          {filters.fechaDesde && (
            <FilterBadge
              label="Prueba desde"
              value={filters.fechaDesde}
              onRemove={() => set("fechaDesde", "")}
              tone="secondary"
            />
          )}
          {filters.fechaHasta && (
            <FilterBadge
              label="Prueba hasta"
              value={filters.fechaHasta}
              onRemove={() => set("fechaHasta", "")}
              tone="secondary"
            />
          )}
        </ActiveFiltersIndicator>
      )}
    </FiltersLayout>
  );
};
