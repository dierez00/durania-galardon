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
  if (value === "ok") return "text-success";
  if (value === "positivo" || value === "prueba_vencida") return "text-error";
  if (value === "por_vencer") return "text-warning";
  return "text-muted-foreground";
};

const getSexoColor = (value: string): string => {
  if (value === "M") return "text-info";
  if (value === "F") return "text-highlight";
  return "text-muted-foreground";
};

const getSanitarioBadgeTone = (value: string) => {
  if (value === "ok") return "success";
  if (value === "positivo" || value === "prueba_vencida") return "error";
  if (value === "por_vencer") return "warning";
  return "neutral";
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
              v === "apto" ? "text-success" : "text-error"
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
              onRemove={() => set("search", "")} tone="info" />
          )}
          {filters.sexo && (
            <FilterBadge
              icon={Cow}
              label="Sexo"
              value={filters.sexo === "M" ? "Macho" : "Hembra"}
              onRemove={() => set("sexo", "")}
              tone={filters.sexo === "M" ? "info" : "accent"}
            />
          )}
          {filters.sanitario && (
            <FilterBadge
              icon={getSanitarioIcon(filters.sanitario)}
              label="Sanitario"
              value={sanitarioOptions.find((o) => o.value === filters.sanitario)?.label ?? filters.sanitario}
              onRemove={() => set("sanitario", "")}
              tone={getSanitarioBadgeTone(filters.sanitario)}
            />
          )}
          {filters.exportable && (
            <FilterBadge
              icon={filters.exportable === "apto" ? CheckCircle2 : XCircle}
              label="Exportable"
              value={exportableOptions.find((o) => o.value === filters.exportable)?.label ?? filters.exportable}
              onRemove={() => set("exportable", "")}
              tone={filters.exportable === "apto" ? "success" : "error"}
            />
          )}
          {filters.fechaDesde && (
            <FilterBadge label="Nacimiento desde" value={filters.fechaDesde}
              onRemove={() => set("fechaDesde", "")} tone="secondary" />
          )}
          {filters.fechaHasta && (
            <FilterBadge label="Nacimiento hasta" value={filters.fechaHasta}
              onRemove={() => set("fechaHasta", "")} tone="secondary" />
          )}
        </ActiveFiltersIndicator>
      )}
    </FiltersLayout>
  );
};
