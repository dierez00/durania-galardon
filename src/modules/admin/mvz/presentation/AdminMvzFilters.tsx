"use client";

import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { AdminMvzFiltersState } from "@/modules/admin/mvz/domain/entities/AdminMvzEntity";

interface Props {
  filters: AdminMvzFiltersState;
  onChange: (filters: AdminMvzFiltersState) => void;
}

export function AdminMvzFilters({ filters, onChange }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Buscar por nombre o cédula..."
        className="w-72"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
      />
      <Select
        value={filters.status || "all"}
        onValueChange={(v) => onChange({ ...filters, status: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="active">Activo</SelectItem>
          <SelectItem value="inactive">Inactivo</SelectItem>
          <SelectItem value="suspended">Suspendido</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
