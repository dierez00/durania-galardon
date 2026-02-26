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

interface ExportRow {
  id: string;
  upp_id: string;
  status: string;
  tb_br_validated: boolean | null;
  blue_tag_assigned: boolean | null;
  blocked_reason: string | null;
}

export default function MvzExportacionesPage() {
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/mvz/exports", {
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

  const validate = async (id: string) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return;
    }

    await fetch("/api/mvz/exports", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id,
        status: "mvz_validated",
        tbBrValidated: true,
        blueTagAssigned: true,
      }),
    });

    await loadRows();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exportaciones</h1>
        <p className="text-sm text-muted-foreground">Revision MVZ de solicitudes por UPP asignada.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes</CardTitle>
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
                  <TableHead>Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                    <TableCell>{row.upp_id.slice(0, 8)}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.tb_br_validated === null ? "-" : row.tb_br_validated ? "SI" : "NO"}</TableCell>
                    <TableCell>{row.blue_tag_assigned === null ? "-" : row.blue_tag_assigned ? "SI" : "NO"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => validate(row.id)}>
                        Validar
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
