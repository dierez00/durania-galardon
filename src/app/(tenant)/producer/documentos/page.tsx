"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
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
  ocr_confidence: number | null;
  document_type: { key: string; name: string } | null;
}

const DOC_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  validated: "Validado",
  expired: "Vencido",
  rejected: "Rechazado",
};

function docStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "validated") return "default";
  if (status === "expired" || status === "rejected") return "destructive";
  return "secondary";
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const days30 = 30 * 24 * 60 * 60 * 1000;
  return new Date(expiryDate).getTime() - Date.now() < days30;
}

export default function ProducerDocumentosPage() {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [documentTypeKey, setDocumentTypeKey] = useState("ine");
  const [fileStorageKey, setFileStorageKey] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
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

    const response = await fetch("/api/producer/documents", {
      headers: { Authorization: `Bearer ${accessToken}` },
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
    if (!documentTypeKey.trim() || !fileStorageKey.trim() || !fileHash.trim()) return;
    setSubmitting(true);
    setErrorMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setSubmitting(false);
      return;
    }

    const response = await fetch("/api/producer/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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
      setSubmitting(false);
      return;
    }

    setFileStorageKey("");
    setFileHash("");
    setExpiryDate("");
    setSubmitting(false);
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
          <CardTitle>Registrar documento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="docType">Tipo de documento (key)</Label>
            <Input
              id="docType"
              value={documentTypeKey}
              placeholder="ine, curp, licencia..."
              onChange={(e) => setDocumentTypeKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storageKey">Clave de almacenamiento</Label>
            <Input
              id="storageKey"
              value={fileStorageKey}
              placeholder="bucket/path/file.pdf"
              onChange={(e) => setFileStorageKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hash">Hash del archivo</Label>
            <Input
              id="hash"
              value={fileHash}
              placeholder="sha256:..."
              onChange={(e) => setFileHash(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Fecha de vigencia</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button
              onClick={createDocument}
              disabled={!documentTypeKey.trim() || !fileStorageKey.trim() || !fileHash.trim() || submitting}
            >
              {submitting ? "Guardando..." : "Registrar documento"}
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
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay documentos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Confianza OCR</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Subido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.document_type?.name ?? row.document_type_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant={docStatusVariant(row.status)}>
                        {DOC_STATUS_LABELS[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.expiry_date ? (
                        <span
                          className={[
                            "text-sm",
                            isExpiringSoon(row.expiry_date) ? "text-yellow-600 font-medium" : "",
                            row.status === "expired" ? "text-destructive" : "",
                          ].join(" ")}
                        >
                          {row.expiry_date}
                          {isExpiringSoon(row.expiry_date) && row.status !== "expired" ? " \u26A0\uFE0F" : ""}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {row.ocr_confidence != null
                        ? `${Math.round(row.ocr_confidence * 100)}%`
                        : "-"}
                    </TableCell>
                    <TableCell>{row.is_current ? "Si" : "No"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(row.uploaded_at).toLocaleDateString("es-MX")}
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


