"use client";

import React from "react";
import { Search, ShieldAlert, ShieldCheck, Shield, Bug as Cow } from "lucide-react";
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
import type { BovinosFiltersState } from "@/modules/bovinos/domain/entities/Bovino";

interface BovinosFiltersProps {
  readonly filters: BovinosFiltersState;
  readonly onFiltersChange: (next: BovinosFiltersState) => void;
  readonly onAddBovino?: () => void;
}

// ─── Opciones de filtro ───────────────────────────────────────────────────────
const sexoOptions: FilterOption[] = [
  { value: "Macho",  label: "Macho" },
  { value: "Hembra", label: "Hembra" },
];

const sanitarioOptions: FilterOption[] = [
  { value: "Limpio",     label: "Limpio" },
  { value: "Cuarentena", label: "Cuarentena" },
  { value: "Reactor",    label: "Reactor" },
];

// ─── Helpers de icono/color dinámicos ────────────────────────────────────────
const getSanitarioIcon = (value: string): LucideIcon => {
  if (value === "Limpio")     return ShieldCheck;
  if (value === "Cuarentena") return ShieldAlert;
  if (value === "Reactor")    return Shield;
  return ShieldCheck;
};

const getSanitarioColor = (value: string): string => {
  if (value === "Limpio")     return "text-emerald-600";
  if (value === "Cuarentena") return "text-amber-600";
  if (value === "Reactor")    return "text-red-600";
  return "text-muted-foreground";
};

const getSexoColor = (value: string): string => {
  if (value === "Macho")  return "text-blue-600";
  if (value === "Hembra") return "text-pink-600";
  return "text-muted-foreground";
};

const getSanitarioBadgeColor = (value: string): string => {
  if (value === "Limpio")     return "bg-emerald-100 text-emerald-700";
  if (value === "Cuarentena") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
};

// ─── Componente ───────────────────────────────────────────────────────────────
export const BovinosFilters: React.FC<BovinosFiltersProps> = ({
  filters,
  onFiltersChange,
  onAddBovino,
}) => {
  const set = <K extends keyof BovinosFiltersState>(
    key: K,
    value: BovinosFiltersState[K]
  ) => onFiltersChange({ ...filters, [key]: value });

  const clearAll = () =>
    onFiltersChange({ search: "", sexo: "", sanitario: "", fechaDesde: "", fechaHasta: "" });

  const hasActiveFilters = !!(
    filters.search || filters.sexo || filters.sanitario ||
    filters.fechaDesde || filters.fechaHasta
  );

  const actionButtons: ActionButtonConfig[] = onAddBovino
    ? [{ label: "Alta de Bovino", icon: Cow, onClick: onAddBovino, variant: "primary", title: "Registrar nuevo bovino" }]
    : [];

  return (
    <FiltersLayout>
      <FiltersContainer>
        {/* Fila 1: búsqueda + botones */}
        <FiltersRow>
          <SearchBar
            value={filters.search}
            onChange={(v) => set("search", v)}
            placeholder="Buscar por arete, raza, rancho o productor..."
          />
          {actionButtons.length > 0 && <ActionButtons buttons={actionButtons} />}
        </FiltersRow>

        {/* Fila 2: selects y rango de fechas */}
        <FiltersGroup>
          <FilterSelect
            value={filters.sexo}
            onChange={(v) => set("sexo", v)}
            options={sexoOptions}
            icon={Cow}
            placeholder="Todos los sexos"
            getOptionColor={getSexoColor}
          />
          <FilterSelect
            value={filters.sanitario}
            onChange={(v) => set("sanitario", v)}
            options={sanitarioOptions}
            icon={getSanitarioIcon(filters.sanitario)}
            placeholder="Estado sanitario"
            getOptionColor={getSanitarioColor}
          />
          <DateRangeFilter
            startDate={filters.fechaDesde}
            endDate={filters.fechaHasta}
            onStartDateChange={(v) => set("fechaDesde", v)}
            onEndDateChange={(v) => set("fechaHasta", v)}
            startPlaceholder="Nacimiento desde"
            endPlaceholder="Nacimiento hasta"
          />
        </FiltersGroup>
      </FiltersContainer>

      {/* Banda de filtros activos */}
      {hasActiveFilters && (
        <ActiveFiltersIndicator onClearAll={clearAll}>
          {filters.search && (
            <FilterBadge icon={Search} label="Búsqueda" value={filters.search}
              onRemove={() => set("search", "")} colorClass="bg-blue-100 text-blue-700" />
          )}
          {filters.sexo && (
            <FilterBadge icon={Cow} label="Sexo" value={filters.sexo}
              onRemove={() => set("sexo", "")}
              colorClass={filters.sexo === "Macho" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"} />
          )}
          {filters.sanitario && (
            <FilterBadge icon={getSanitarioIcon(filters.sanitario)} label="Sanitario" value={filters.sanitario}
              onRemove={() => set("sanitario", "")}
              colorClass={getSanitarioBadgeColor(filters.sanitario)} />
          )}
          {filters.fechaDesde && (
            <FilterBadge label="Nacimiento desde" value={filters.fechaDesde}
              onRemove={() => set("fechaDesde", "")} colorClass="bg-sky-100 text-sky-700" />
          )}
          {filters.fechaHasta && (
            <FilterBadge label="Nacimiento hasta" value={filters.fechaHasta}
              onRemove={() => set("fechaHasta", "")} colorClass="bg-sky-100 text-sky-700" />
          )}
        </ActiveFiltersIndicator>
      )}
    </FiltersLayout>
  );
};
