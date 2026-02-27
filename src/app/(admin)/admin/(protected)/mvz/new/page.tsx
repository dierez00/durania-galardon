"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { SpreadsheetBatchEditor } from "@/shared/ui/spreadsheet";
import { buildCsv, downloadCsv } from "@/shared/ui/spreadsheet/utils";
import type { SpreadsheetColumn } from "@/shared/ui/spreadsheet";
import type {
  AdminMvzBatchRowInput,
  AdminMvzRoleKey,
} from "@/modules/admin/mvz/domain/repositories/adminMvzRepository";
import { useCreateAdminMvzBatch } from "@/modules/admin/mvz/presentation/hooks/useCreateAdminMvzBatch";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MVZ_COLUMNS: SpreadsheetColumn<AdminMvzBatchRowInput>[] = [
  {
    key: "email",
    header: "Email",
    required: true,
    normalize: (value) => value.trim().toLowerCase(),
    validate: (value) => (EMAIL_REGEX.test(value) ? null : "Email invalido."),
  },
  {
    key: "fullName",
    header: "Nombre completo",
    required: true,
    normalize: (value) => value.trim(),
  },
  {
    key: "licenseNumber",
    header: "Cedula/Licencia",
    required: true,
    normalize: (value) => value.trim().toUpperCase(),
  },
];

export default function AdminMvzBatchCreatePage() {
  const [roleKey, setRoleKey] = useState<AdminMvzRoleKey>("mvz_government");
  const { creating, error, createdRows, handleCreateBatch } = useCreateAdminMvzBatch();

  const handleDownloadCredentials = () => {
    if (createdRows.length === 0) return;
    const csv = buildCsv(
      ["rowIndex", "entityId", "tenantId", "email", "temporaryPassword"],
      createdRows.map((row) => [
        String(row.rowIndex),
        row.entityId,
        row.tenantId,
        row.email,
        row.temporaryPassword,
      ])
    );
    downloadCsv("mvz-credenciales.csv", csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Alta masiva de MVZ</h1>
          <p className="text-sm text-muted-foreground">
            Pega filas desde Excel, define el rol del lote y crea hasta 100 registros.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/mvz">
            <ArrowLeft className="h-4 w-4" />
            Volver a MVZ
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rol tenant para el lote</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={roleKey} onValueChange={(value) => setRoleKey(value as AdminMvzRoleKey)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mvz_government">MVZ Gobierno</SelectItem>
              <SelectItem value="mvz_internal">MVZ Interno</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <SpreadsheetBatchEditor<AdminMvzBatchRowInput>
        entityLabel="MVZ"
        columns={MVZ_COLUMNS}
        maxRows={100}
        submitLabel="Crear MVZ"
        submitting={creating}
        externalError={error}
        onSubmit={(rows) => handleCreateBatch(rows, roleKey)}
      />

      {createdRows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Credenciales temporales generadas</CardTitle>
              <Button variant="outline" size="sm" onClick={handleDownloadCredentials}>
                <Download className="h-4 w-4" />
                Descargar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fila</TableHead>
                  <TableHead>ID entidad</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Password temporal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {createdRows.map((row) => (
                  <TableRow key={`${row.entityId}-${row.rowIndex}`}>
                    <TableCell>{row.rowIndex + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{row.entityId}</TableCell>
                    <TableCell className="font-mono text-xs">{row.tenantId}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell className="font-mono text-xs">{row.temporaryPassword}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
