"use client";

import { SearchBar } from "@/shared/ui/filters/search-bar";
import { FilterSelect } from "@/shared/ui/filters/filter-select";
import {
  FiltersLayout,
  FiltersContainer,
  FiltersRow,
} from "@/shared/ui/filters/filters-layout";
import type { ProducerUppsFiltersState } from "@/modules/producer/ranchos/domain/entities/ProducerUppEntity";

const ALL_SENTINEL = "all";

const STATUS_OPTIONS = [
  { value: ALL_SENTINEL, label: "Todos los estados" },
  { value: "active", label: "Activo" },
  { value: "quarantined", label: "Cuarentena" },
  { value: "suspended", label: "Suspendido" },
];

interface ProducerUppsFiltersProps {
  readonly filters: ProducerUppsFiltersState;
  readonly onChange: (next: ProducerUppsFiltersState) => void;
}

export function ProducerUppsFilters({ filters, onChange }: ProducerUppsFiltersProps) {
  return (
    <FiltersLayout>
      <FiltersContainer>
        <FiltersRow>
          <SearchBar
            value={filters.search}
            onChange={(value) => onChange({ ...filters, search: value })}
            placeholder="Buscar por nombre o código UPP..."
          />
          <FilterSelect
            value={filters.status === "" ? ALL_SENTINEL : filters.status}
            onChange={(value) =>
              onChange({ ...filters, status: value === ALL_SENTINEL ? "" : value })
            }
            options={STATUS_OPTIONS}
            placeholder="Estado"
          />
        </FiltersRow>
      </FiltersContainer>
    </FiltersLayout>
  );
}
