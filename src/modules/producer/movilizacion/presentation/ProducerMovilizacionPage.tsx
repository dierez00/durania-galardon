"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { getAccessToken } from "@/shared/lib/auth-session";
import { useProducerUppContext } from "@/modules/producer/ranchos/presentation";

interface MovementRow {
  id: string;
  upp_id: string | null;
  status: string;
  qr_code: string | null;
  route_note: string | null;
  incidence_note: string | null;
  movement_date: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  requested: "Solicitado",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

function movementStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "rejected" || status === "cancelled") return "destructive";
  return "secondary";
}

export default function ProducerMovilizacionPage() {
  const { upps, selectedUppId, selectedUpp } = useProducerUppContext();
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [formUppId, setFormUppId] = useState("");
  const [movementDate, setMovementDate] = useState("");
  const [routeNote, setRouteNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedUppId && !formUppId) setFormUppId(selectedUppId);
  }, [selectedUppId, formUppId]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const params = selectedUppId ? `?uppId=${encodeURIComponent(selectedUppId)}` : "";
    const response = await fetch(`/api/producer/movements${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar historial de movilizaciones.");
      setLoading(false);
      return;
    }

    setRows(body.data.movements ?? []);
    setLoading(false);
  }, [selectedUppId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const createMovement = async () => {
    if (!formUppId) return;
    setSubmitting(true);
    setErrorMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setSubmitting(false);
      return;
    }

    const response = await fetch("/api/producer/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        uppId: formUppId,
        movementDate: movementDate || undefined,
        routeNote: routeNote || undefined,
      }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible crear solicitud de movilizacion.");
      setSubmitting(false);
      return;
    }

    setMovementDate("");
    setRouteNote("");
    setSubmitting(false);
    await loadRows();
  };

  const uppName = (uppId: string | null) => {
    if (!uppId) return "-";
    return upps.find((upp) => upp.id === uppId)?.name ?? uppId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Movilizacion (REEMO)</h1>
        <p className="text-sm text-muted-foreground">
          {selectedUpp ? `Rancho: ${selectedUpp.name}` : "Solicitud y seguimiento de movilizacion ganadera."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva solicitud de movilizacion</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="formUppId">Rancho (UPP)</Label>
            <Select value={formUppId} onValueChange={setFormUppId}>
              <SelectTrigger id="formUppId">
                <SelectValue placeholder="Seleccionar rancho..." />
              </SelectTrigger>
              <SelectContent>
                {upps.map((upp) => (
                  <SelectItem key={upp.id} value={upp.id}>
                    {upp.name} {upp.upp_code ? `(${upp.upp_code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="movementDate">Fecha de movimiento</Label>
            <Input
              id="movementDate"
              type="date"
              value={movementDate}
              onChange={(event) => setMovementDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="routeNote">Nota de ruta</Label>
            <Input
              id="routeNote"
              value={routeNote}
              placeholder="Opcional"
              onChange={(event) => setRouteNote(event.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <Button onClick={createMovement} disabled={!formUppId || submitting}>
              {submitting ? "Enviando..." : "Solicitar movilizacion"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de movilizaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay solicitudes de movilizacion.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Rancho</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ruta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                    <TableCell>{uppName(row.upp_id)}</TableCell>
                    <TableCell>
                      <Badge variant={movementStatusVariant(row.status)}>
                        {STATUS_LABELS[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.qr_code ? (
                        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{row.qr_code}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pendiente</span>
                      )}
                    </TableCell>
                    <TableCell>{row.movement_date ?? "-"}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">{row.route_note ?? "-"}</TableCell>
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
