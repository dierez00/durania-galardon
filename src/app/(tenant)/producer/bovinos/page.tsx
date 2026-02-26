<<<<<<< Updated upstream
"use client";
=======
import LegacyPage from "@/modules/animals/presentation/AnimalsPage";
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

interface BovinoRow {
  id: string;
  upp_id: string;
  siniiga_tag: string;
  sex: "M" | "F";
  birth_date: string | null;
  status: string;
}

export default function ProducerBovinosPage() {
  const [rows, setRows] = useState<BovinoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [uppId, setUppId] = useState("");
  const [siniigaTag, setSiniigaTag] = useState("");
  const [sex, setSex] = useState<"M" | "F">("M");
  const [birthDate, setBirthDate] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/producer/bovinos", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar bovinos.");
      setLoading(false);
      return;
    }

    setRows(body.data.bovinos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const createBovino = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      return;
    }

    const response = await fetch("/api/producer/bovinos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        uppId,
        siniigaTag,
        sex,
        birthDate: birthDate || undefined,
      }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible registrar bovino.");
      return;
    }

    setUppId("");
    setSiniigaTag("");
    setBirthDate("");
    await loadRows();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bovinos</h1>
        <p className="text-sm text-muted-foreground">Registro de animales por UPP con estatus sanitario.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar bovino</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="uppId">UPP ID</Label>
            <Input id="uppId" value={uppId} onChange={(event) => setUppId(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag">Arete SINIIGA</Label>
            <Input id="tag" value={siniigaTag} onChange={(event) => setSiniigaTag(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sex">Sexo (M/F)</Label>
            <Input
              id="sex"
              value={sex}
              maxLength={1}
              onChange={(event) => setSex(event.target.value.toUpperCase() === "F" ? "F" : "M")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Fecha nacimiento</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>
          <div>
            <Button onClick={createBovino} disabled={!uppId.trim() || !siniigaTag.trim()}>
              Registrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de bovinos</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arete</TableHead>
                  <TableHead>UPP</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Nacimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.siniiga_tag}</TableCell>
                    <TableCell>{row.upp_id}</TableCell>
                    <TableCell>{row.sex}</TableCell>
                    <TableCell>{row.birth_date ?? "-"}</TableCell>
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
