"use client";

import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { AdminExportacionesFiltersState } from "@/modules/admin/exportaciones/domain/entities/AdminExportacionEntity";

interface Props {
  filters: AdminExportacionesFiltersState;
  onChange: (filters: AdminExportacionesFiltersState) => void;
}

export function AdminExportacionesFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Buscar por UPP..."
        className="w-64"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
      />
      <Select
        value={filters.status || "all"}
        onValueChange={(v) => onChange({ ...filters, status: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="pending_review">En revision</SelectItem>
          <SelectItem value="final_approved">Aprobada</SelectItem>
          <SelectItem value="blocked">Bloqueada</SelectItem>
          <SelectItem value="draft">Borrador</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
