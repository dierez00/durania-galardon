"use client";

import React from "react";
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Bug as Cow,
  CheckCircle2,
  XCircle,
} from "lucide-react";
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
  { value: "M", label: "Macho" },
  { value: "F", label: "Hembra" },
];

const sanitarioOptions: FilterOption[] = [
  { value: "ok",           label: "Sin alerta" },
  { value: "por_vencer",   label: "Por vencer" },
  { value: "prueba_vencida", label: "Prueba vencida" },
  { value: "positivo",     label: "Positivo" },
  { value: "sin_pruebas",  label: "Sin pruebas" },
];

const exportableOptions: FilterOption[] = [
  { value: "apto",    label: "Apto para exportar" },
  { value: "no_apto", label: "No apto" },
];

// ─── Helpers de icono/color dinámicos ────────────────────────────────────────
const getSanitarioIcon = (value: string): LucideIcon => {
  if (value === "ok") return ShieldCheck;
  if (value === "positivo" || value === "prueba_vencida") return Shield;
  if (value === "por_vencer") return ShieldAlert;
  return ShieldCheck;
};

const getSanitarioColor = (value: string): string => {
  if (value === "ok") return "text-emerald-600";
  if (value === "positivo" || value === "prueba_vencida") return "text-red-600";
  if (value === "por_vencer") return "text-amber-600";
  return "text-muted-foreground";
};

const getSexoColor = (value: string): string => {
  if (value === "M") return "text-blue-600";
  if (value === "F") return "text-pink-600";
  return "text-muted-foreground";
};

const getSanitarioBadgeColor = (value: string): string => {
  if (value === "ok") return "bg-emerald-100 text-emerald-700";
  if (value === "positivo" || value === "prueba_vencida") return "bg-red-100 text-red-700";
  if (value === "por_vencer") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-700";
};

const CLEAR_STATE: BovinosFiltersState = {
  search: "",
  sexo: "",
  sanitario: "",
  exportable: "",
  fechaDesde: "",
  fechaHasta: "",
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

  const clearAll = () => onFiltersChange(CLEAR_STATE);

  const hasActiveFilters = !!(
    filters.search ||
    filters.sexo ||
    filters.sanitario ||
    filters.exportable ||
    filters.fechaDesde ||
    filters.fechaHasta
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
            placeholder="Buscar por arete SINIIGA, rancho o clave UPP..."
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
          <FilterSelect
            value={filters.exportable}
            onChange={(v) => set("exportable", v)}
            options={exportableOptions}
            icon={filters.exportable === "no_apto" ? XCircle : CheckCircle2}
            placeholder="Exportabilidad"
            getOptionColor={(v) =>
              v === "apto" ? "text-emerald-600" : "text-red-600"
            }
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
            <FilterBadge
              icon={Cow}
              label="Sexo"
              value={filters.sexo === "M" ? "Macho" : "Hembra"}
              onRemove={() => set("sexo", "")}
              colorClass={filters.sexo === "M" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}
            />
          )}
          {filters.sanitario && (
            <FilterBadge
              icon={getSanitarioIcon(filters.sanitario)}
              label="Sanitario"
              value={sanitarioOptions.find((o) => o.value === filters.sanitario)?.label ?? filters.sanitario}
              onRemove={() => set("sanitario", "")}
              colorClass={getSanitarioBadgeColor(filters.sanitario)}
            />
          )}
          {filters.exportable && (
            <FilterBadge
              icon={filters.exportable === "apto" ? CheckCircle2 : XCircle}
              label="Exportable"
              value={exportableOptions.find((o) => o.value === filters.exportable)?.label ?? filters.exportable}
              onRemove={() => set("exportable", "")}
              colorClass={filters.exportable === "apto" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}
            />
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
