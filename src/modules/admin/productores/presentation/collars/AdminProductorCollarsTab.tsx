"use client";

import { Button, Card, CardContent } from "@/shared/ui";
import {
  CollarsTable,
  CollarsFilters,
  type CollarsFiltersState,
  type CollarSortState,
  type CollarListItem,
} from "@/modules/collars/presentation";
import { useProducerCollars } from "./hooks/useProducerCollars";
import { useState } from "react";

interface Props {
  producerId: string;
  producerName?: string;
}

export function AdminProductorCollarsTab({
  producerId,
  producerName,
}: Readonly<Props>) {
  const { collars, total, page, pageSize, loading, error, setPage } =
    useProducerCollars(producerId);

  const [filters, setFilters] = useState<CollarsFiltersState>({
    search: "",
    status: "",
    firmware: "",
    productor_id: "",
    dateFrom: "",
    dateTo: "",
  });

  const [sort, setSort] = useState<CollarSortState>({
    field: "linked_at",
    dir: "desc",
  });

  // Filter collars locally based on filters
  const filteredCollars = collars.filter((collar) => {
    if (filters.search && !collar.collar_id.includes(filters.search)) {
      return false;
    }
    if (filters.status && collar.status !== filters.status) {
      return false;
    }
    if (filters.firmware && collar.firmware_version !== filters.firmware) {
      return false;
    }
    return true;
  });

  // Sort collars locally
  const sortedCollars = [...filteredCollars].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    if (sort.field === "linked_at") {
      aVal = a.linked_at ? new Date(a.linked_at).getTime() : 0;
      bVal = b.linked_at ? new Date(b.linked_at).getTime() : 0;
    } else if (sort.field === "status") {
      aVal = a.status;
      bVal = b.status;
    } else if (sort.field === "firmware") {
      aVal = a.firmware_version;
      bVal = b.firmware_version;
    } else {
      aVal = a.collar_id;
      bVal = b.collar_id;
    }

    if (aVal < bVal) return sort.dir === "desc" ? 1 : -1;
    if (aVal > bVal) return sort.dir === "desc" ? -1 : 1;
    return 0;
  });

  const tableCollars: CollarListItem[] = sortedCollars.map((collar) => ({
    id: collar.id,
    collar_id: collar.collar_id,
    producer_id: "",
    producer_name: producerName ?? "",
    firmware_version: collar.firmware_version,
    status: collar.status,
    linked_at: collar.linked_at,
    purchased_at: null,
    created_at: "",
  }));

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-center text-muted-foreground">
          Cargando collares del productor...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <CollarsFilters
        filters={filters}
        onChange={setFilters}
        showProducerSelect={false}
      />

      <CollarsTable
        collars={tableCollars}
        sort={sort}
        onSortChange={(newSort) => setSort(newSort)}
        showActions={false}
      />

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <div className="flex items-center gap-2 px-4">
            <span className="text-sm text-muted-foreground">
              Página {page} de {Math.ceil(total / pageSize)}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage(Math.min(Math.ceil(total / pageSize), page + 1))
            }
            disabled={page >= Math.ceil(total / pageSize) || loading}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
