"use client";

import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { AdminCuarentenasFiltersState } from "@/modules/admin/cuarentenas/domain/entities/AdminCuarentenaEntity";

interface Props {
  filters: AdminCuarentenasFiltersState;
  onChange: (filters: AdminCuarentenasFiltersState) => void;
}

export function AdminCuarentenasFilters({ filters, onChange }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Buscar por titulo o UPP..."
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
          <SelectItem value="active">Activa</SelectItem>
          <SelectItem value="released">Liberada</SelectItem>
          <SelectItem value="pending">Pendiente</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.quarantine_type || "all"}
        onValueChange={(v) => onChange({ ...filters, quarantine_type: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          <SelectItem value="state">Estatal</SelectItem>
          <SelectItem value="federal">Federal</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
