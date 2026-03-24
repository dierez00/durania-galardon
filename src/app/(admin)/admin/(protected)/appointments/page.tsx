"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { getAccessToken } from "@/shared/lib/auth-session";

interface AppointmentItem {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  requested_service: string;
  requested_date: string | null;
  requested_time: string | null;
  notes: string | null;
  status: "requested" | "contacted" | "scheduled" | "discarded";
  created_at: string;
}

const STATUS_FLOW: AppointmentItem["status"][] = ["requested", "contacted", "scheduled", "discarded"];

function nextStatus(current: AppointmentItem["status"]): AppointmentItem["status"] {
  const index = STATUS_FLOW.indexOf(current);
  if (index === -1 || index === STATUS_FLOW.length - 1) {
    return current;
  }
  return STATUS_FLOW[index + 1];
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesión activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/appointments", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar citas.");
      setLoading(false);
      return;
    }

    setAppointments(body.data.appointments ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const updateStatus = async (item: AppointmentItem) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return;
    }

    const status = nextStatus(item.status);
    if (status === item.status) {
      return;
    }

    const response = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id: item.id,
        status,
      }),
    });

    if (!response.ok) {
      const body = await response.json();
      setErrorMessage(body.error?.message ?? "No fue posible actualizar la cita.");
      return;
    }

    await loadAppointments();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Citas públicas</h1>
        <p className="text-sm text-muted-foreground">
          Solicitudes enviadas desde el portal público y su seguimiento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de cita</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.created_at).toLocaleString("es-MX")}</TableCell>
                    <TableCell className="font-medium">{item.full_name}</TableCell>
                    <TableCell>{item.requested_service}</TableCell>
                    <TableCell>{item.phone ?? item.email ?? "-"}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={item.status === "discarded" || item.status === "scheduled"}
                        onClick={() => updateStatus(item)}
                      >
                        Avanzar estado
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
