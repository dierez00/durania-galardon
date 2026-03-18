"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
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

interface ExportRow {
  id: string;
  upp_id: string | null;
  status: string;
  compliance_60_rule: boolean | null;
  tb_br_validated: boolean | null;
  blue_tag_assigned: boolean | null;
  blocked_reason: string | null;
  monthly_bucket: string | null;
  created_at: string;
}

const EXPORT_STATUS_LABELS: Record<string, string> = {
  requested: "Solicitado",
  mvz_validated: "Validado MVZ",
  final_approved: "Aprobado",
  blocked: "Bloqueado",
  rejected: "Rechazado",
};

function exportStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "final_approved") return "default";
  if (status === "mvz_validated") return "secondary";
  if (status === "blocked" || status === "rejected") return "destructive";
  return "outline";
}

function BoolChip({ value, label }: { value: boolean | null; label: string }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <MinusCircle className="h-3 w-3" />
        {label}
      </span>
    );
  }

  if (value) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-500">
      <XCircle className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function ProducerExportacionesPage() {
  const { upps, selectedUppId, selectedUpp } = useProducerUppContext();
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [formUppId, setFormUppId] = useState("");
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
    const response = await fetch(`/api/producer/exports${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar exportaciones.");
      setLoading(false);
      return;
    }

    setRows(body.data.exports ?? []);
    setLoading(false);
  }, [selectedUppId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const createExport = async () => {
    if (!formUppId) return;
    setSubmitting(true);
    setErrorMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setSubmitting(false);
      return;
    }

    const response = await fetch("/api/producer/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ uppId: formUppId }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible crear solicitud de exportacion.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    await loadRows();
  };

  const uppName = (uppId: string | null) =>
    !uppId ? "-" : upps.find((upp) => upp.id === uppId)?.name ?? uppId.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exportaciones</h1>
        <p className="text-sm text-muted-foreground">
          {selectedUpp ? `Rancho: ${selectedUpp.name}` : "Solicitudes de exportacion de tus UPPs."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva solicitud de exportacion</CardTitle>
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
          <div className="flex items-end">
            <Button onClick={createExport} disabled={!formUppId || submitting}>
              {submitting ? "Enviando..." : "Solicitar exportacion"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de exportaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay solicitudes de exportacion.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Rancho</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cumplimiento</TableHead>
                  <TableHead>Motivo bloqueo</TableHead>
                  <TableHead>Mes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                    <TableCell>{uppName(row.upp_id)}</TableCell>
                    <TableCell>
                      <Badge variant={exportStatusVariant(row.status)}>
                        {EXPORT_STATUS_LABELS[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <BoolChip value={row.compliance_60_rule} label="60 dias" />
                        <BoolChip value={row.tb_br_validated} label="TB/BR" />
                        <BoolChip value={row.blue_tag_assigned} label="Arete azul" />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm">{row.blocked_reason ?? "-"}</TableCell>
                    <TableCell className="text-sm">{row.monthly_bucket ? row.monthly_bucket.slice(0, 7) : "-"}</TableCell>
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
