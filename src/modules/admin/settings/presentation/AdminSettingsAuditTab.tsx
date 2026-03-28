"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/shared/lib/auth-session";
import { filterAuditoriaLogs } from "@/modules/admin/auditoria/application/use-cases/filterAuditoriaLogs";
import type {
  AuditoriaFiltersState,
  AuditoriaLog,
} from "@/modules/admin/auditoria/domain/entities/AuditoriaLogEntity";
import { AuditoriaFilters } from "@/modules/admin/auditoria/presentation/AuditoriaFilters";
import { AuditoriaList } from "@/modules/admin/auditoria/presentation/AuditoriaList";

interface AdminAuditPayload {
  ok?: boolean;
  data?: {
    logs?: AuditoriaLog[];
  };
  error?: {
    message?: string;
  };
}

const DEFAULT_FILTERS: AuditoriaFiltersState = {
  search: "",
  action: "",
  resource: "",
};

export default function AdminSettingsAuditTab() {
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [filters, setFilters] = useState<AuditoriaFiltersState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/audit?limit=200", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const body = (await response.json()) as AdminAuditPayload;
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar la bitacora.");
      setLoading(false);
      return;
    }

    setLogs(body.data?.logs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => filterAuditoriaLogs(logs, filters), [filters, logs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Auditoria</h2>
          <p className="text-sm text-muted-foreground">
            Filtra eventos criticos, cambios de estado y operaciones sensibles del panel.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{filteredLogs.length} eventos visibles</p>
      </div>

      <AuditoriaFilters filters={filters} onChange={setFilters} />

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando bitacora...</p>
      ) : (
        <AuditoriaList logs={filteredLogs} />
      )}
    </div>
  );
}
