"use client";

import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { NormativaFiltersState } from "@/modules/admin/normativa/domain/entities/NormativaSettingEntity";

interface Props {
  filters: NormativaFiltersState;
  onChange: (filters: NormativaFiltersState) => void;
}

export function NormativaFilters({ filters, onChange }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Buscar por clave..."
        className="w-64"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
      />
      <Select
        value={filters.status || "all"}
        onValueChange={(v) => onChange({ ...filters, status: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Activa</SelectItem>
          <SelectItem value="expired">Vencida</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
