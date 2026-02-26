<<<<<<< Updated upstream
"use client";
=======
import LegacyPage from "@/modules/tests/presentation/TestsPage";
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

interface TestRow {
  id: string;
  animal_id: string;
  upp_id: string;
  test_type_id: string;
  sample_date: string;
  result: string;
  valid_until: string | null;
}

export default function MvzPruebasPage() {
  const [rows, setRows] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [uppId, setUppId] = useState("");
  const [testTypeKey, setTestTypeKey] = useState("tb");
  const [sampleDate, setSampleDate] = useState("");
  const [result, setResult] = useState<"negative" | "positive" | "inconclusive">("negative");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/mvz/tests", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar pruebas.");
      setLoading(false);
      return;
    }

    setRows(body.data.tests ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const createTest = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      return;
    }

    const response = await fetch("/api/mvz/tests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        animalId,
        uppId,
        testTypeKey,
        sampleDate,
        result,
      }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible registrar prueba.");
      return;
    }

    setAnimalId("");
    setUppId("");
    setSampleDate("");
    await loadRows();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pruebas Sanitarias</h1>
        <p className="text-sm text-muted-foreground">Registro y consulta de pruebas TB/BR.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva prueba</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="animalId">Animal ID</Label>
            <Input id="animalId" value={animalId} onChange={(event) => setAnimalId(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uppId">UPP ID</Label>
            <Input id="uppId" value={uppId} onChange={(event) => setUppId(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="testTypeKey">Tipo (tb/br)</Label>
            <Input id="testTypeKey" value={testTypeKey} onChange={(event) => setTestTypeKey(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sampleDate">Fecha</Label>
            <Input
              id="sampleDate"
              type="date"
              value={sampleDate}
              onChange={(event) => setSampleDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="result">Resultado</Label>
            <Input
              id="result"
              value={result}
              onChange={(event) => {
                const value = event.target.value.toLowerCase();
                if (value === "positive" || value === "inconclusive") {
                  setResult(value);
                } else {
                  setResult("negative");
                }
              }}
            />
          </div>
          <div>
            <Button
              onClick={createTest}
              disabled={!animalId.trim() || !uppId.trim() || !testTypeKey.trim() || !sampleDate}
            >
              Registrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de pruebas</CardTitle>
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
                  <TableHead>Animal</TableHead>
                  <TableHead>UPP</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                    <TableCell>{row.animal_id.slice(0, 8)}</TableCell>
                    <TableCell>{row.upp_id.slice(0, 8)}</TableCell>
                    <TableCell>{row.sample_date}</TableCell>
                    <TableCell>{row.result}</TableCell>
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
