"use client";

import React from "react";
import { CalendarDays, Cpu, Search, Zap } from "lucide-react";
import {
  ActiveFiltersIndicator,
  DateRangeFilter,
  FilterBadge,
  FiltersContainer,
  FiltersGroup,
  FiltersLayout,
  FiltersRow,
  FilterSelect,
  SearchBar,
  type FilterOption,
} from "@/shared/ui/filters";

export interface ProducerCollarsFiltersState {
  search: string;
  status: string;
  firmware: string;
  linkedFrom: string;
  linkedTo: string;
}

interface ProducerCollarsFiltersProps {
  readonly filters: ProducerCollarsFiltersState;
  readonly firmwareOptions: string[];
  readonly onChange: (next: ProducerCollarsFiltersState) => void;
}

const statusOptions: FilterOption[] = [
  { value: "inactive", label: "Inactivo" },
  { value: "active", label: "Activo" },
  { value: "linked", label: "Vinculado" },
  { value: "unlinked", label: "Desvinculado" },
  { value: "suspended", label: "Suspendido" },
  { value: "retired", label: "Retirado" },
];

const CLEAR_STATE: ProducerCollarsFiltersState = {
  search: "",
  status: "",
  firmware: "",
  linkedFrom: "",
  linkedTo: "",
};

export const ProducerCollarsFilters: React.FC<ProducerCollarsFiltersProps> = ({
  filters,
  firmwareOptions,
  onChange,
}) => {
  const set = <K extends keyof ProducerCollarsFiltersState>(
    key: K,
    value: ProducerCollarsFiltersState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.firmware || filters.linkedFrom || filters.linkedTo
  );

  return (
    <FiltersLayout>
      <FiltersContainer>
        <FiltersRow>
          <SearchBar
            value={filters.search}
            onChange={(value) => set("search", value)}
            placeholder="Buscar por collar ID"
          />
        </FiltersRow>

        <FiltersGroup>
          <FilterSelect
            value={filters.status}
            onChange={(value) => set("status", value)}
            options={statusOptions}
            icon={Zap}
            placeholder="Todos los estados"
          />

          <FilterSelect
            value={filters.firmware}
            onChange={(value) => set("firmware", value)}
            options={firmwareOptions.map((firmware) => ({
              value: firmware,
              label: firmware,
            }))}
            icon={Cpu}
            placeholder="Todos los firmware"
          />

          <DateRangeFilter
            startDate={filters.linkedFrom}
            endDate={filters.linkedTo}
            onStartDateChange={(value) => set("linkedFrom", value)}
            onEndDateChange={(value) => set("linkedTo", value)}
            startPlaceholder="Vinculado desde"
            endPlaceholder="Vinculado hasta"
          />
        </FiltersGroup>
      </FiltersContainer>

      {hasActiveFilters && (
        <ActiveFiltersIndicator onClearAll={() => onChange(CLEAR_STATE)}>
          {filters.search ? (
            <FilterBadge
              icon={Search}
              label="Busqueda"
              value={filters.search}
              tone="info"
              onRemove={() => set("search", "")}
            />
          ) : null}

          {filters.status ? (
            <FilterBadge
              icon={Zap}
              label="Estado"
              value={statusOptions.find((option) => option.value === filters.status)?.label ?? filters.status}
              tone="secondary"
              onRemove={() => set("status", "")}
            />
          ) : null}

          {filters.firmware ? (
            <FilterBadge
              icon={Cpu}
              label="Firmware"
              value={filters.firmware}
              tone="neutral"
              onRemove={() => set("firmware", "")}
            />
          ) : null}

          {filters.linkedFrom ? (
            <FilterBadge
              icon={CalendarDays}
              label="Vinculado desde"
              value={filters.linkedFrom}
              tone="secondary"
              onRemove={() => set("linkedFrom", "")}
            />
          ) : null}

          {filters.linkedTo ? (
            <FilterBadge
              icon={CalendarDays}
              label="Vinculado hasta"
              value={filters.linkedTo}
              tone="secondary"
              onRemove={() => set("linkedTo", "")}
            />
          ) : null}
        </ActiveFiltersIndicator>
      )}
    </FiltersLayout>
  );
};
