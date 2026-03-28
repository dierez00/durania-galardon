"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { filterCitas } from "@/modules/admin/citas/application/use-cases/filterCitas";
import type { Cita, CitaStatus, CitasFiltersState } from "@/modules/admin/citas/domain/entities/CitaEntity";
import { getAccessToken } from "@/shared/lib/auth-session";

const DEFAULT_FILTERS: CitasFiltersState = {
  search: "",
  status: "",
};

export function useAdminAppointments() {
  const [appointments, setAppointments] = useState<Cita[]>([]);
  const [filters, setFilters] = useState<CitasFiltersState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("No existe sesion activa.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/appointments", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const body = await response.json();
      if (!response.ok || !body.ok) {
        setError(body.error?.message ?? "No fue posible cargar citas.");
        return;
      }

      setAppointments(body.data.appointments ?? []);
    } catch {
      setError("No fue posible cargar citas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = useMemo(() => filterCitas(appointments, filters), [appointments, filters]);

  const updateAppointmentStatus = useCallback(async (id: string, status: CitaStatus) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("No existe sesion activa.");
      return false;
    }

    setStatusUpdatingId(id);
    setError("");

    try {
      const response = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id, status }),
      });

      const body = await response.json();
      if (!response.ok || !body.ok) {
        setError(body.error?.message ?? "No fue posible actualizar la cita.");
        return false;
      }

      setAppointments((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item))
      );
      return true;
    } catch {
      setError("No fue posible actualizar la cita.");
      return false;
    } finally {
      setStatusUpdatingId(null);
    }
  }, []);

  return {
    appointments: filteredAppointments,
    total: filteredAppointments.length,
    rawTotal: appointments.length,
    filters,
    setFilters,
    loading,
    error,
    statusUpdatingId,
    updateAppointmentStatus,
    reload: loadAppointments,
  };
}
