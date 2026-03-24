"use client";

import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { AuditoriaFiltersState } from "@/modules/admin/auditoria/domain/entities/AuditoriaLogEntity";

interface Props {
  filters: AuditoriaFiltersState;
  onChange: (filters: AuditoriaFiltersState) => void;
}

export function AuditoriaFilters({ filters, onChange }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Buscar por usuario, recurso..."
        className="w-72"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
      />
      <Select
        value={filters.action || "all"}
        onValueChange={(v) => onChange({ ...filters, action: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Accion" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las acciones</SelectItem>
          <SelectItem value="create">Creacion</SelectItem>
          <SelectItem value="update">Actualización</SelectItem>
          <SelectItem value="delete">Eliminacion</SelectItem>
          <SelectItem value="export">Exportacion</SelectItem>
          <SelectItem value="status_change">Cambio estado</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.resource || "all"}
        onValueChange={(v) => onChange({ ...filters, resource: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Recurso" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los recursos</SelectItem>
          <SelectItem value="producer">Productor</SelectItem>
          <SelectItem value="test">Prueba</SelectItem>
          <SelectItem value="exportacion">Exportacion</SelectItem>
          <SelectItem value="quarantine">Cuarentena</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
