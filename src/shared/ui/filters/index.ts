// ─── Contenedores de layout ───────────────────────────────────────────────────
export {
  FiltersLayout,
  FiltersContainer,
  FiltersRow,
  FiltersGroup,
} from "./filters-layout";

// ─── Componentes de filtro ────────────────────────────────────────────────────
export { SearchBar } from "./search-bar";
export { FilterSelect } from "./filter-select";
export { DateRangeFilter } from "./date-range-filter";
export { FilterBadge, ActiveFiltersIndicator } from "./filter-badge";
export { ActionButtons } from "./action-buttons";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type { FilterOption, FilterOptionGroup } from "./filter-select";
export type { ActionButtonConfig } from "./action-buttons";
