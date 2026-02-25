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
  if (value === "Aprobada")    return "text-emerald-600";
  if (value === "Rechazada")   return "text-red-600";
  if (value === "En revision") return "text-blue-600";
  if (value === "Pendiente")   return "text-amber-600";
  return "text-muted-foreground";
};

const getReactorColor = (value: string): string => {
  if (value === "Si") return "text-red-600";
  if (value === "No") return "text-emerald-600";
  return "text-muted-foreground";
};

function getEstadoBadgeColor(estado: string): string {
  if (estado === "Aprobada")    return "bg-emerald-100 text-emerald-700";
  if (estado === "Rechazada")   return "bg-red-100 text-red-700";
  if (estado === "En revision") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

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
              colorClass="bg-blue-100 text-blue-700"
            />
          )}
          {filters.estado && (
            <FilterBadge
              icon={getEstadoIcon(filters.estado)}
              label="Estado"
              value={filters.estado}
              onRemove={() => set("estado", "")}
              colorClass={getEstadoBadgeColor(filters.estado)}
            />
          )}
          {filters.reactor && (
            <FilterBadge
              icon={filters.reactor === "Si" ? XCircle : CheckCircle}
              label="Reactor"
              value={filters.reactor === "Si" ? "Reactor" : "No reactor"}
              onRemove={() => set("reactor", "")}
              colorClass={filters.reactor === "Si" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}
            />
          )}
          {filters.fechaDesde && (
            <FilterBadge
              label="Prueba desde"
              value={filters.fechaDesde}
              onRemove={() => set("fechaDesde", "")}
              colorClass="bg-sky-100 text-sky-700"
            />
          )}
          {filters.fechaHasta && (
            <FilterBadge
              label="Prueba hasta"
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
