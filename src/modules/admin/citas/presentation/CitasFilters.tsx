"use client";

import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { CitasFiltersState } from "@/modules/admin/citas/domain/entities/CitaEntity";

interface Props {
  filters: CitasFiltersState;
  onChange: (filters: CitasFiltersState) => void;
}

export function CitasFilters({ filters, onChange }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Buscar por nombre, servicio o correo..."
        className="w-80"
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
          <SelectItem value="requested">Solicitada</SelectItem>
          <SelectItem value="contacted">Contactada</SelectItem>
          <SelectItem value="scheduled">Agendada</SelectItem>
          <SelectItem value="discarded">Descartada</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
