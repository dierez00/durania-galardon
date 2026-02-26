<<<<<<< Updated upstream
"use client";
=======
import LegacyPage from "@/modules/exports/presentation/ExportsPage";
>>>>>>> Stashed changes

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { getAccessToken } from "@/shared/lib/auth-session";

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

export default function ProducerExportacionesPage() {
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [uppId, setUppId] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/producer/exports", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar exportaciones.");
      setLoading(false);
      return;
    }

    setRows(body.data.exports ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const createExport = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      return;
    }

    const response = await fetch("/api/producer/exports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ uppId }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible crear solicitud de exportacion.");
      return;
    }

    setUppId("");
    await loadRows();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exportaciones</h1>
        <p className="text-sm text-muted-foreground">Solicitudes de exportacion de tus UPP.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva solicitud</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="uppId">UPP ID</Label>
            <Input id="uppId" value={uppId} onChange={(event) => setUppId(event.target.value)} />
          </div>
          <div>
            <Button onClick={createExport} disabled={!uppId.trim()}>
              Solicitar exportacion
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>UPP</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>TB/BR</TableHead>
                  <TableHead>Arete azul</TableHead>
                  <TableHead>Motivo bloqueo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                    <TableCell>{row.upp_id ?? "-"}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.tb_br_validated === null ? "-" : row.tb_br_validated ? "SI" : "NO"}</TableCell>
                    <TableCell>{row.blue_tag_assigned === null ? "-" : row.blue_tag_assigned ? "SI" : "NO"}</TableCell>
                    <TableCell>{row.blocked_reason ?? "-"}</TableCell>
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
