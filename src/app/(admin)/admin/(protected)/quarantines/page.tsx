"use client";

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

interface QuarantineItem {
  id: string;
  title: string;
  upp_id: string | null;
  status: string;
  quarantine_type: string;
  started_at: string;
}

export default function AdminQuarantinesPage() {
  const [items, setItems] = useState<QuarantineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [title, setTitle] = useState("");
  const [uppId, setUppId] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const accessToken = await getAccessToken();

    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/quarantines", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const body = await response.json();

    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible consultar cuarentenas.");
      setLoading(false);
      return;
    }

    setItems(body.data.quarantines ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const createQuarantine = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      return;
    }

    const response = await fetch("/api/admin/quarantines", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ title, uppId: uppId.trim() || undefined, quarantineType: "state" }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible crear cuarentena.");
      return;
    }

    setTitle("");
    setUppId("");
    await loadItems();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cuarentenas Estatales</h1>
        <p className="text-sm text-muted-foreground">Mapa global de geocercas, liberacion e historial epidemiologico.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activar cuarentena</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Titulo</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uppId">UPP ID (opcional)</Label>
            <Input id="uppId" value={uppId} onChange={(event) => setUppId(event.target.value)} />
          </div>
          <div>
            <Button onClick={createQuarantine} disabled={!title.trim()}>
              Crear cuarentena
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de cuarentenas</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>UPP</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Inicio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.quarantine_type}</TableCell>
                    <TableCell>{item.upp_id ?? "Global"}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{new Date(item.started_at).toLocaleDateString("es-MX")}</TableCell>
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
