"use client";

import React from "react";
import { Search, CheckCircle, XCircle, Clock, TestTube } from "lucide-react";
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
import type { PruebasFiltersState } from "@/modules/pruebas/domain/entities/PruebasEntity";

interface PruebasFiltersProps {
  readonly filters: PruebasFiltersState;
  readonly onFiltersChange: (next: PruebasFiltersState) => void;
  readonly onAddPrueba?: () => void;
}

// ─── Opciones de filtro ───────────────────────────────────────────────────────
const motivoOptions: FilterOption[] = [
  { value: "Exportacion",              label: "Exportacion" },
  { value: "Campana",                  label: "Campana" },
  { value: "Movilizacion",             label: "Movilizacion" },
  { value: "Vigilancia epidemiologica", label: "Vigilancia epidemiologica" },
];

const estadoOptions: FilterOption[] = [
  { value: "Completada",  label: "Completada" },
  { value: "En proceso",  label: "En proceso" },
  { value: "Pendiente",   label: "Pendiente" },
];

// ─── Helpers de icono/color dinámicos ────────────────────────────────────────
const getEstadoIcon = (value: string): LucideIcon => {
  if (value === "Completada") return CheckCircle;
  if (value === "En proceso") return Clock;
  if (value === "Pendiente")  return XCircle;
  return Clock;
};

const getEstadoColor = (value: string): string => {
  if (value === "Completada") return "text-success";
  if (value === "En proceso") return "text-info";
  if (value === "Pendiente")  return "text-warning";
  return "text-muted-foreground";
};

const getMotivoColor = (): string => "text-info";

// ─── Componente ───────────────────────────────────────────────────────────────
export const PruebasFilters: React.FC<PruebasFiltersProps> = ({
  filters,
  onFiltersChange,
  onAddPrueba,
}) => {
  const set = <K extends keyof PruebasFiltersState>(
    key: K,
    value: PruebasFiltersState[K]
  ) => onFiltersChange({ ...filters, [key]: value });

  const clearAll = () =>
    onFiltersChange({ search: "", motivo: "", estado: "", fechaDesde: "", fechaHasta: "" });

  const hasActiveFilters = !!(
    filters.search || filters.motivo || filters.estado ||
    filters.fechaDesde || filters.fechaHasta
  );

  const actionButtons: ActionButtonConfig[] = onAddPrueba
    ? [{ label: "Nueva Prueba", icon: TestTube, onClick: onAddPrueba, variant: "primary", title: "Registrar nueva prueba sanitaria" }]
    : [];

  return (
    <FiltersLayout>
      <FiltersContainer>
        {/* Fila 1: búsqueda + botones */}
        <FiltersRow>
          <SearchBar
            value={filters.search}
            onChange={(v) => set("search", v)}
            placeholder="Buscar por MVZ, lugar o motivo..."
          />
          {actionButtons.length > 0 && <ActionButtons buttons={actionButtons} />}
        </FiltersRow>

        {/* Fila 2: selects y rango de fechas */}
        <FiltersGroup>
          <FilterSelect
            value={filters.motivo}
            onChange={(v) => set("motivo", v)}
            options={motivoOptions}
            icon={TestTube}
            placeholder="Todos los motivos"
            getOptionColor={getMotivoColor}
          />
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
            startPlaceholder="Fecha desde"
            endPlaceholder="Fecha hasta"
          />
        </FiltersGroup>
      </FiltersContainer>

      {/* Banda de filtros activos */}
      {hasActiveFilters && (
        <ActiveFiltersIndicator onClearAll={clearAll}>
          {filters.search && (
            <FilterBadge icon={Search} label="Búsqueda" value={filters.search}
              onRemove={() => set("search", "")} tone="info" />
          )}
          {filters.motivo && (
            <FilterBadge icon={TestTube} label="Motivo" value={filters.motivo}
              onRemove={() => set("motivo", "")} tone="info" />
          )}
          {filters.estado && (
            <FilterBadge icon={getEstadoIcon(filters.estado)} label="Estado" value={filters.estado}
              onRemove={() => set("estado", "")}
              tone={
                filters.estado === "Completada"
                  ? "success"
                  : filters.estado === "En proceso"
                    ? "info"
                    : "warning"
              } />
          )}
          {filters.fechaDesde && (
            <FilterBadge label="Fecha desde" value={filters.fechaDesde}
              onRemove={() => set("fechaDesde", "")} tone="secondary" />
          )}
          {filters.fechaHasta && (
            <FilterBadge label="Fecha hasta" value={filters.fechaHasta}
              onRemove={() => set("fechaHasta", "")} tone="secondary" />
          )}
        </ActiveFiltersIndicator>
      )}
    </FiltersLayout>
  );
};
