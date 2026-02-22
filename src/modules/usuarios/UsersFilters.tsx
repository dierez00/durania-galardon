"use client";

import React from "react";
import { Search, UserCheck, UserX, Users, Shield } from "lucide-react";
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
} from "@/components/filters/index";
import type { UsersFiltersState } from "@/core/users/types";

interface UsersFiltersProps {
  filters: UsersFiltersState;
  onFiltersChange: (next: UsersFiltersState) => void;
  onAddUser?: () => void;
}

// ─── Opciones de filtro ───────────────────────────────────────────────────────
const roleOptions: FilterOption[] = [
  { value: "Administrador", label: "Administrador" },
  { value: "MVZ",           label: "MVZ" },
  { value: "Ventanilla",    label: "Ventanilla" },
  { value: "Productor",     label: "Productor" },
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

const getRoleColor = (value: string): string => {
  const map: Record<string, string> = {
    Administrador: "text-purple-600",
    MVZ:           "text-blue-600",
    Ventanilla:    "text-amber-600",
    Productor:     "text-emerald-600",
  };
  return map[value] ?? "text-muted-foreground";
};

// ─── Componente ───────────────────────────────────────────────────────────────
export const UsersFilters: React.FC<UsersFiltersProps> = ({
  filters,
  onFiltersChange,
  onAddUser,
}) => {
  const set = <K extends keyof UsersFiltersState>(
    key: K,
    value: UsersFiltersState[K]
  ) => onFiltersChange({ ...filters, [key]: value });

  const clearAll = () =>
    onFiltersChange({ search: "", role: "", estado: "", fechaDesde: "", fechaHasta: "" });

  const hasActiveFilters = !!(
    filters.search || filters.role || filters.estado ||
    filters.fechaDesde || filters.fechaHasta
  );

  const actionButtons: ActionButtonConfig[] = onAddUser
    ? [{ label: "Nuevo Usuario", icon: Shield, onClick: onAddUser, variant: "primary", title: "Agregar usuario" }]
    : [];

  return (
    <FiltersLayout>
      <FiltersContainer>
        {/* Fila 1: búsqueda + botones */}
        <FiltersRow>
          <SearchBar
            value={filters.search}
            onChange={(v) => set("search", v)}
            placeholder="Buscar por nombre, correo o rol..."
          />
          {actionButtons.length > 0 && <ActionButtons buttons={actionButtons} />}
        </FiltersRow>

        {/* Fila 2: selects y rango de fechas */}
        <FiltersGroup>
          <FilterSelect
            value={filters.role}
            onChange={(v) => set("role", v)}
            options={roleOptions}
            icon={Shield}
            placeholder="Todos los roles"
            getOptionColor={getRoleColor}
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
            startPlaceholder="Acceso desde"
            endPlaceholder="Acceso hasta"
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
          {filters.role && (
            <FilterBadge icon={Shield} label="Rol" value={filters.role}
              onRemove={() => set("role", "")} colorClass="bg-purple-100 text-purple-700" />
          )}
          {filters.estado && (
            <FilterBadge icon={getEstadoIcon(filters.estado)} label="Estado" value={filters.estado}
              onRemove={() => set("estado", "")}
              colorClass={filters.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"} />
          )}
          {filters.fechaDesde && (
            <FilterBadge label="Acceso desde" value={filters.fechaDesde}
              onRemove={() => set("fechaDesde", "")} colorClass="bg-sky-100 text-sky-700" />
          )}
          {filters.fechaHasta && (
            <FilterBadge label="Acceso hasta" value={filters.fechaHasta}
              onRemove={() => set("fechaHasta", "")} colorClass="bg-sky-100 text-sky-700" />
          )}
        </ActiveFiltersIndicator>
      )}
    </FiltersLayout>
  );
};
