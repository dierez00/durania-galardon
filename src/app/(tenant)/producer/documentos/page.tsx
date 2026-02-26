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

interface DocumentRow {
  id: string;
  document_type_id: string;
  file_storage_key: string;
  status: string;
  is_current: boolean;
  expiry_date: string | null;
  uploaded_at: string;
}

export default function ProducerDocumentosPage() {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [documentTypeKey, setDocumentTypeKey] = useState("ine");
  const [fileStorageKey, setFileStorageKey] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const accessToken = await getAccessToken();

    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/producer/documents", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar documentos.");
      setLoading(false);
      return;
    }

    setRows(body.data.documents ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const createDocument = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      return;
    }

    const response = await fetch("/api/producer/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        documentTypeKey,
        fileStorageKey,
        fileHash,
        expiryDate: expiryDate || undefined,
      }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible registrar documento.");
      return;
    }

    setFileStorageKey("");
    setFileHash("");
    setExpiryDate("");
    await loadRows();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentos</h1>
        <p className="text-sm text-muted-foreground">Carga y seguimiento documental del productor.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subir documento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="docType">Tipo (key)</Label>
            <Input id="docType" value={documentTypeKey} onChange={(event) => setDocumentTypeKey(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storageKey">Storage key</Label>
            <Input id="storageKey" value={fileStorageKey} onChange={(event) => setFileStorageKey(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hash">Hash</Label>
            <Input id="hash" value={fileHash} onChange={(event) => setFileHash(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Vigencia</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
            />
          </div>
          <div>
            <Button onClick={createDocument} disabled={!documentTypeKey.trim() || !fileStorageKey.trim() || !fileHash.trim()}>
              Subir
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos registrados</CardTitle>
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Vigencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                    <TableCell>{row.document_type_id}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.is_current ? "SI" : "NO"}</TableCell>
                    <TableCell>{row.expiry_date ?? "-"}</TableCell>
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
