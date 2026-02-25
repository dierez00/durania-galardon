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

interface UppItem {
  id: string;
  producer_id: string;
  producerName: string;
  upp_code: string | null;
  name: string;
  herd_limit: number | null;
  herdCount: number;
  status: string;
}

export default function AdminUppsPage() {
  const [items, setItems] = useState<UppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [producerId, setProducerId] = useState("");
  const [name, setName] = useState("");

  const loadUpps = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/upps", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar UPP.");
      setLoading(false);
      return;
    }

    setItems(body.data.upps ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUpps();
  }, [loadUpps]);

  const createUpp = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      return;
    }

    const response = await fetch("/api/admin/upps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ producerId, name }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible crear UPP.");
      return;
    }

    setProducerId("");
    setName("");
    await loadUpps();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ranchos / UPP</h1>
        <p className="text-sm text-muted-foreground">Registro, edicion legal, bloqueo y capacidad de hato.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar UPP</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="producerId">Producer ID</Label>
            <Input id="producerId" value={producerId} onChange={(event) => setProducerId(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uppName">Nombre UPP</Label>
            <Input id="uppName" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Button onClick={createUpp} disabled={!producerId.trim() || !name.trim()}>
              Crear UPP
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>UPP registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Productor</TableHead>
                  <TableHead>Hato</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.upp_code ?? "-"}</TableCell>
                    <TableCell>{item.producerName}</TableCell>
                    <TableCell>{item.herdCount}</TableCell>
                    <TableCell>{item.herd_limit ?? "-"}</TableCell>
                    <TableCell>{item.status}</TableCell>
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
