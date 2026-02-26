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

interface UppRow {
  id: string;
  upp_code: string | null;
  name: string;
  address_text: string | null;
  hectares_total: number | null;
  herd_limit: number | null;
  status: string;
  created_at: string;
}

export default function ProducerRanchosPage() {
  const [rows, setRows] = useState<UppRow[]>([]);
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

    const response = await fetch("/api/producer/upp", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar ranchos.");
      setLoading(false);
      return;
    }

    setRows(body.data.upps ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ranchos</h1>
        <p className="text-sm text-muted-foreground">Listado de UPP con acceso para tu usuario.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UPP disponibles</CardTitle>
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>Direccion</TableHead>
                  <TableHead>Limite Hato</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.upp_code ?? row.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.address_text ?? "-"}</TableCell>
                    <TableCell>{row.herd_limit ?? "-"}</TableCell>
                    <TableCell>{row.status}</TableCell>
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
