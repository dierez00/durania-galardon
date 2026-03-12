"use client";

import React from "react";
import { Search, UserCheck, UserX, Users, MapPin } from "lucide-react";
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
import type { ProductoresFiltersState } from "@/modules/productores/domain/entities/ProductoresEntity";

interface ProductoresFiltersProps {
  filters: ProductoresFiltersState;
  onFiltersChange: (next: ProductoresFiltersState) => void;
  onAddProductor?: () => void;
}

// ─── Opciones de filtro ───────────────────────────────────────────────────────
const municipioOptions: FilterOption[] = [
  { value: "Chihuahua",  label: "Chihuahua" },
  { value: "Delicias",   label: "Delicias" },
  { value: "Cuauhtemoc", label: "Cuauhtemoc" },
  { value: "Juarez",     label: "Juarez" },
  { value: "Parral",     label: "Parral" },
  { value: "Camargo",    label: "Camargo" },
];

const estadoOptions: FilterOption[] = [
  { value: "Activo",   label: "Activo" },
  { value: "Inactivo", label: "Inactivo" },
];

// ─── Helpers de icono/color dinámicos ────────────────────────────────────────
const getEstadoIcon = (value: string): LucideIcon => {
  if (value === "Activo")   return UserCheck;
  if (value === "Inactivo") return UserX;
  return Users;
};

const getEstadoColor = (value: string): string => {
  if (value === "Activo")   return "text-emerald-600";
  if (value === "Inactivo") return "text-red-500";
  return "text-muted-foreground";
};

const getMunicipioColor = (): string => "text-blue-600";

// ─── Componente ───────────────────────────────────────────────────────────────
export const ProductoresFilters: React.FC<ProductoresFiltersProps> = ({
  filters,
  onFiltersChange,
  onAddProductor,
}) => {
  const set = <K extends keyof ProductoresFiltersState>(
    key: K,
    value: ProductoresFiltersState[K]
  ) => onFiltersChange({ ...filters, [key]: value });

  const clearAll = () =>
    onFiltersChange({ search: "", municipio: "", estado: "", fechaDesde: "", fechaHasta: "" });

  const hasActiveFilters = !!(
    filters.search || filters.municipio || filters.estado ||
    filters.fechaDesde || filters.fechaHasta
  );

  const actionButtons: ActionButtonConfig[] = onAddProductor
    ? [{ label: "Alta de Productor", icon: MapPin, onClick: onAddProductor, variant: "primary", title: "Registrar nuevo productor" }]
    : [];

  return (
    <FiltersLayout>
      <FiltersContainer>
        {/* Fila 1: búsqueda + botones */}
        <FiltersRow>
          <SearchBar
            value={filters.search}
            onChange={(v) => set("search", v)}
            placeholder="Buscar por nombre, CURP o municipio..."
          />
          {actionButtons.length > 0 && <ActionButtons buttons={actionButtons} />}
        </FiltersRow>

        {/* Fila 2: selects y rango de fechas */}
        <FiltersGroup>
          <FilterSelect
            value={filters.municipio}
            onChange={(v) => set("municipio", v)}
            options={municipioOptions}
            icon={MapPin}
            placeholder="Todos los municipios"
            getOptionColor={getMunicipioColor}
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
            startPlaceholder="Registro desde"
            endPlaceholder="Registro hasta"
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
          {filters.municipio && (
            <FilterBadge icon={MapPin} label="Municipio" value={filters.municipio}
              onRemove={() => set("municipio", "")} colorClass="bg-blue-100 text-blue-700" />
          )}
          {filters.estado && (
            <FilterBadge icon={getEstadoIcon(filters.estado)} label="Estado" value={filters.estado}
              onRemove={() => set("estado", "")}
              colorClass={filters.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"} />
          )}
          {filters.fechaDesde && (
            <FilterBadge label="Registro desde" value={filters.fechaDesde}
              onRemove={() => set("fechaDesde", "")} colorClass="bg-sky-100 text-sky-700" />
          )}
          {filters.fechaHasta && (
            <FilterBadge label="Registro hasta" value={filters.fechaHasta}
              onRemove={() => set("fechaHasta", "")} colorClass="bg-sky-100 text-sky-700" />
          )}
        </ActiveFiltersIndicator>
      )}
    </FiltersLayout>
  );
};
