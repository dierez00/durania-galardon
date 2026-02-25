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

interface ProducerItem {
  id: string;
  full_name: string;
  curp: string | null;
  status: string;
  created_at: string;
  documents: {
    validated: number;
    pending: number;
    expired: number;
  };
}

export default function AdminProducersPage() {
  const [producers, setProducers] = useState<ProducerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [curp, setCurp] = useState("");

  const loadProducers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/producers", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar productores.");
      setLoading(false);
      return;
    }

    setProducers(body.data.producers ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProducers();
  }, [loadProducers]);

  const createProducer = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      return;
    }

    const response = await fetch("/api/admin/producers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ fullName, curp }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible crear productor.");
      return;
    }

    setFullName("");
    setCurp("");
    await loadProducers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion de Productores</h1>
        <p className="text-sm text-muted-foreground">Alta, baja/suspension, estado documental e historial.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alta de productor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="curp">CURP</Label>
            <Input id="curp" value={curp} onChange={(event) => setCurp(event.target.value)} />
          </div>
          <div>
            <Button onClick={createProducer} disabled={!fullName.trim()}>
              Crear productor
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productores registrados</CardTitle>
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
                  <TableHead>CURP</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {producers.map((producer) => (
                  <TableRow key={producer.id}>
                    <TableCell className="font-medium">{producer.full_name}</TableCell>
                    <TableCell>{producer.curp ?? "-"}</TableCell>
                    <TableCell>{producer.status}</TableCell>
                    <TableCell>
                      V:{producer.documents.validated} P:{producer.documents.pending} E:{producer.documents.expired}
                    </TableCell>
                    <TableCell>{new Date(producer.created_at).toLocaleDateString("es-MX")}</TableCell>
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
