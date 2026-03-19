"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ProducerUppsFilters } from "./ProducerUppsFilters";
import { ProducerUppsList } from "./ProducerUppsList";
import { useProducerUpps } from "./hooks/useProducerUpps";

export default function ProducerOrganizationProjectsPage() {
  const { upps, loading, error, filters, onFiltersChange } = useProducerUpps();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ranchos / UPPs</h1>
        <p className="text-sm text-muted-foreground">
          Home organizacional para explorar los proyectos disponibles de tu tenant.
        </p>
      </div>

      <ProducerUppsFilters filters={filters} onChange={onFiltersChange} />

      <Card>
        <CardHeader>
          <CardTitle>Proyectos disponibles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="px-6 pb-4 text-sm text-destructive">{error}</p>
          ) : null}
          {loading ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Cargando proyectos...</p>
          ) : (
            <ProducerUppsList upps={upps} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
