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
import { Button } from "@/shared/ui/button";
import { getAccessToken } from "@/shared/lib/auth-session";

interface ExportItem {
  id: string;
  upp_id: string | null;
  status: string;
  compliance_60_rule: boolean | null;
  tb_br_validated: boolean | null;
  blue_tag_assigned: boolean | null;
  blocked_reason: string | null;
  created_at: string;
}

export default function AdminExportsPage() {
  const [items, setItems] = useState<ExportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/exports", {
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

    setItems(body.data.exports ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const approve = async (id: string) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return;
    }

    await fetch("/api/admin/exports", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id,
        status: "final_approved",
      }),
    });

    await loadData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exportaciones - Autorizacion final</h1>
        <p className="text-sm text-muted-foreground">Validacion final de tramites y bloqueo por incumplimiento.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de exportacion</CardTitle>
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
                  <TableHead>Regla 60%</TableHead>
                  <TableHead>TB/BR</TableHead>
                  <TableHead>Arete Azul</TableHead>
                  <TableHead>Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id.slice(0, 8)}</TableCell>
                    <TableCell>{item.upp_id ?? "-"}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.compliance_60_rule ? "SI" : "NO"}</TableCell>
                    <TableCell>{item.tb_br_validated ? "SI" : "NO"}</TableCell>
                    <TableCell>{item.blue_tag_assigned ? "SI" : "NO"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => approve(item.id)}>
                        Aprobar
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
