"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { getAccessToken } from "@/shared/lib/auth-session";

interface AssignmentRow {
  assignment_id: string;
  upp_id: string;
  upp_name: string;
  producer_name: string;
  sanitary_alert: string;
  tb_status: string | null;
  br_status: string | null;
  active_animals: number;
}

export default function MvzAsignacionesPage() {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
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

    const response = await fetch("/api/mvz/assignments", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar asignaciones.");
      setLoading(false);
      return;
    }

    setRows(body.data.assignments ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Asignaciones MVZ</h1>
        <p className="text-sm text-muted-foreground">UPP asignadas con su estado sanitario consolidado.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rutas asignadas</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UPP</TableHead>
                  <TableHead>Productor</TableHead>
                  <TableHead>Animales</TableHead>
                  <TableHead>TB</TableHead>
                  <TableHead>BR</TableHead>
                  <TableHead>Alerta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.assignment_id}>
                    <TableCell className="font-medium">{row.upp_name}</TableCell>
                    <TableCell>{row.producer_name}</TableCell>
                    <TableCell>{row.active_animals ?? 0}</TableCell>
                    <TableCell>{row.tb_status ?? "-"}</TableCell>
                    <TableCell>{row.br_status ?? "-"}</TableCell>
                    <TableCell>{row.sanitary_alert}</TableCell>
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
