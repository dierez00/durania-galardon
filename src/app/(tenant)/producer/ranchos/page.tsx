"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  ProducerUppsList,
  ProducerUppsFilters,
  useProducerUpps,
} from "@/modules/producer/ranchos/presentation";

export default function ProducerRanchosPage() {
  const { upps, loading, error, filters, onFiltersChange } = useProducerUpps();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ranchos</h1>
        <p className="text-sm text-muted-foreground">
          Listado de UPP con acceso para tu usuario.
        </p>
      </div>

      <ProducerUppsFilters filters={filters} onChange={onFiltersChange} />

      <Card>
        <CardHeader>
          <CardTitle>UPP disponibles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="px-6 pb-4 text-sm text-destructive">{error}</p>
          ) : null}
          {loading ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <ProducerUppsList upps={upps} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

