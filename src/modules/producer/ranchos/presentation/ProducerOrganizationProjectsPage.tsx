"use client";

import { ProducerUppsFilters } from "./ProducerUppsFilters";
import { ProducerUppCard } from "./ProducerUppCard";
import { useProducerUpps } from "./hooks/useProducerUpps";

export default function ProducerOrganizationProjectsPage() {
  const { upps, loading, error, filters, onFiltersChange } = useProducerUpps();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ranchos / UPPs</h1>
        <p className="text-sm text-muted-foreground">
          Explora y accede a los ranchos (UPPs) disponibles en tu organización.
        </p>
      </div>

      <ProducerUppsFilters filters={filters} onChange={onFiltersChange} />

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando proyectos...</p>
      ) : upps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No se encontraron ranchos con los filtros actuales.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {upps.map((upp) => (
            <ProducerUppCard key={upp.id} upp={upp} />
          ))}
        </div>
      )}
    </div>
  );
}
