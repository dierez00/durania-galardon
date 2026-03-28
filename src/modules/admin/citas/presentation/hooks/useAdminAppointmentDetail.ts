"use client";

import { useCallback, useEffect, useState } from "react";
import type { Cita, CitaStatus } from "@/modules/admin/citas/domain/entities/CitaEntity";
import { getAccessToken } from "@/shared/lib/auth-session";

export type AppointmentDetailTab = "overview" | "notes";

interface UseAdminAppointmentDetailOptions {
  initialTab?: AppointmentDetailTab;
}

export function useAdminAppointmentDetail(id: string, options: UseAdminAppointmentDetailOptions = {}) {
  const [appointment, setAppointment] = useState<Cita | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<AppointmentDetailTab>(options.initialTab ?? "overview");
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    setActiveTab(options.initialTab ?? "overview");
  }, [options.initialTab]);

  const loadAppointment = useCallback(async () => {
    setLoading(true);
    setError("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("No existe sesion activa.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const body = await response.json();
      if (!response.ok || !body.ok) {
        setError(body.error?.message ?? "No fue posible cargar la cita.");
        return;
      }

      setAppointment(body.data.appointment ?? null);
    } catch {
      setError("No fue posible cargar la cita.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAppointment();
  }, [loadAppointment]);

  const updateStatus = useCallback(async (status: CitaStatus) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("No existe sesion activa.");
      return false;
    }

    setStatusSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });

      const body = await response.json();
      if (!response.ok || !body.ok) {
        setError(body.error?.message ?? "No fue posible actualizar la cita.");
        return false;
      }

      setAppointment(body.data.appointment ?? null);
      return true;
    } catch {
      setError("No fue posible actualizar la cita.");
      return false;
    } finally {
      setStatusSaving(false);
    }
  }, [id]);

  return {
    appointment,
    loading,
    error,
    activeTab,
    handleTabChange: setActiveTab,
    statusSaving,
    updateStatus,
    reload: loadAppointment,
  };
}
