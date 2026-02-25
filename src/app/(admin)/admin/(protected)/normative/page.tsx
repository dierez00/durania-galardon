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

interface NormativeSetting {
  id: string;
  key: string;
  value_json: Record<string, unknown>;
  effective_from: string;
  effective_until: string | null;
  status: string;
}

export default function AdminNormativePage() {
  const [items, setItems] = useState<NormativeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [key, setKey] = useState("rule_60");
  const [value, setValue] = useState("0.60");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/normative", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar configuracion normativa.");
      setLoading(false);
      return;
    }

    setItems(body.data.settings ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const createSetting = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      return;
    }

    const response = await fetch("/api/admin/normative", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        key,
        valueJson: {
          value,
        },
      }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible crear configuracion normativa.");
      return;
    }

    await loadSettings();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Catalogos / Configuracion Normativa</h1>
        <p className="text-sm text-muted-foreground">Regla 60%, vigencia TB/BR, agostadero y parametros sanitarios.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo parametro normativo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="settingKey">Clave</Label>
            <Input id="settingKey" value={key} onChange={(event) => setKey(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settingValue">Valor</Label>
            <Input id="settingValue" value={value} onChange={(event) => setValue(event.target.value)} />
          </div>
          <div>
            <Button onClick={createSetting} disabled={!key.trim() || !value.trim()}>
              Guardar parametro
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parametros vigentes</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clave</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vigencia desde</TableHead>
                  <TableHead>Vigencia hasta</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.key}</TableCell>
                    <TableCell>{JSON.stringify(item.value_json)}</TableCell>
                    <TableCell>{item.effective_from}</TableCell>
                    <TableCell>{item.effective_until ?? "-"}</TableCell>
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
