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

interface MvzItem {
  id: string;
  user_id: string;
  full_name: string;
  license_number: string;
  status: string;
  assignedUpps: number;
  registeredTests: number;
  created_at: string;
}

export default function AdminMvzPage() {
  const [items, setItems] = useState<MvzItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const loadMvz = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/mvz", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar MVZ.");
      setLoading(false);
      return;
    }

    setItems(body.data.mvzProfiles ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadMvz();
  }, [loadMvz]);

  const createMvz = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      return;
    }

    const response = await fetch("/api/admin/mvz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId, fullName, licenseNumber }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible crear MVZ.");
      return;
    }

    setUserId("");
    setFullName("");
    setLicenseNumber("");
    await loadMvz();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion de MVZ</h1>
        <p className="text-sm text-muted-foreground">Alta, suspension, asignacion territorial e historial de pruebas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alta de MVZ</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="mvzUserId">User ID</Label>
            <Input id="mvzUserId" value={userId} onChange={(event) => setUserId(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mvzName">Nombre completo</Label>
            <Input id="mvzName" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mvzLicense">Cedula/Licencia</Label>
            <Input id="mvzLicense" value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} />
          </div>
          <div>
            <Button onClick={createMvz} disabled={!userId.trim() || !fullName.trim() || !licenseNumber.trim()}>
              Crear MVZ
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>MVZ registrados</CardTitle>
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
                  <TableHead>Licencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>UPP asignadas</TableHead>
                  <TableHead>Pruebas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.full_name}</TableCell>
                    <TableCell>{item.license_number}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.assignedUpps}</TableCell>
                    <TableCell>{item.registeredTests}</TableCell>
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
