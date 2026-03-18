"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
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
import { useProducerUppContext } from "@/modules/producer/ranchos/presentation";

interface EmployeeRow {
  id: string;
  userId: string;
  email: string;
  membershipStatus: string;
  roleKey: string | null;
  roleName: string | null;
  uppAccess: Array<{ uppId: string; accessLevel: string; status: string }>;
  joinedAt: string;
}

const ACCESS_LEVEL_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  editor: "secondary",
  viewer: "outline",
};

const MEMBERSHIP_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  inactive: "secondary",
  suspended: "destructive",
};

export default function ProducerEmpleadosPage() {
  const { upps } = useProducerUppContext();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [selectedUppIds, setSelectedUppIds] = useState<string[]>([]);
  const [accessLevel, setAccessLevel] = useState<"viewer" | "editor" | "owner">("viewer");
  const [submitting, setSubmitting] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/producer/employees", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar empleados.");
      setLoading(false);
      return;
    }

    setRows(body.data.employees ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const toggleUpp = (uppId: string) => {
    setSelectedUppIds((current) =>
      current.includes(uppId) ? current.filter((id) => id !== uppId) : [...current, uppId]
    );
  };

  const createEmployee = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    setErrorMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setSubmitting(false);
      return;
    }

    const response = await fetch("/api/producer/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ email: email.trim(), uppIds: selectedUppIds, accessLevel }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible registrar empleado.");
      setSubmitting(false);
      return;
    }

    setEmail("");
    setSelectedUppIds([]);
    setAccessLevel("viewer");
    setSubmitting(false);
    await loadRows();
  };

  const uppName = (uppId: string) => upps.find((upp) => upp.id === uppId)?.name ?? uppId.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Empleados</h1>
        <p className="text-sm text-muted-foreground">Gestion de membresias y accesos UPP del personal.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agregar empleado existente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Correo del empleado</Label>
              <Input
                id="email"
                type="email"
                value={email}
                placeholder="empleado@ejemplo.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nivel de acceso</Label>
              <div className="flex gap-2">
                {(["viewer", "editor", "owner"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setAccessLevel(level)}
                    className={[
                      "rounded border px-3 py-1 text-sm capitalize transition",
                      accessLevel === level
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50",
                    ].join(" ")}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {upps.length > 0 ? (
            <div className="space-y-2">
              <Label>UPPs asignadas</Label>
              <div className="flex flex-wrap gap-2">
                {upps.map((upp) => (
                  <button
                    key={upp.id}
                    onClick={() => toggleUpp(upp.id)}
                    className={[
                      "rounded border px-3 py-1 text-sm transition",
                      selectedUppIds.includes(upp.id)
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border hover:border-primary/50",
                    ].join(" ")}
                  >
                    {upp.name} {upp.upp_code ? `(${upp.upp_code})` : ""}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <Button onClick={createEmployee} disabled={!email.trim() || submitting}>
            {submitting ? "Agregando..." : "Agregar empleado"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Empleados actuales</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay empleados registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acceso a UPPs</TableHead>
                  <TableHead>Alta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.email}</TableCell>
                    <TableCell>{row.roleName ?? row.roleKey ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={MEMBERSHIP_VARIANT[row.membershipStatus] ?? "secondary"}>
                        {row.membershipStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.uppAccess.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Sin acceso</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.uppAccess.map((access) => (
                            <Badge
                              key={access.uppId}
                              variant={ACCESS_LEVEL_VARIANT[access.accessLevel] ?? "outline"}
                              className="text-xs"
                            >
                              {uppName(access.uppId)} / {access.accessLevel}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(row.joinedAt).toLocaleDateString("es-MX")}
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
