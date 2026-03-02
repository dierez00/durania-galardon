"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import {
  Button,
  Card, CardContent, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  SpreadsheetBatchEditor,
  buildExcelBuffer,
  downloadExcel,
} from "@/shared/ui";
import type { SpreadsheetColumn } from "@/shared/ui";
import type { AdminProductorBatchRowInput } from "@/modules/admin/productores/domain/repositories/adminProductoresRepository";
import { useCreateAdminProductoresBatch } from "@/modules/admin/productores/presentation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

const PRODUCTOR_COLUMNS: SpreadsheetColumn<AdminProductorBatchRowInput>[] = [
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
    key: "curp",
    header: "CURP (opcional)",
    required: false,
    normalize: (value) => value.trim().toUpperCase(),
    validate: (value) => {
      if (!value) return null;
      if (value.length > 18) return "La CURP no puede exceder 18 caracteres.";
      return CURP_REGEX.test(value) ? null : "CURP inválida (formato: AAAA000000HAAAAAA0).";
    },
  },
];

export default function AdminProducersBatchCreatePage() {
  const { creating, error, createdRows, handleCreateBatch } = useCreateAdminProductoresBatch();

  const handleDownloadCredentials = () => {
    if (createdRows.length === 0) return;
    const buffer = buildExcelBuffer(
      ["Fila", "ID entidad", "Tenant", "Email", "Password temporal"],
      createdRows.map((row) => [
        String(row.rowIndex + 1),
        row.entityId,
        row.tenantId,
        row.email,
        row.temporaryPassword,
      ])
    );
    downloadExcel("productores-credenciales.xlsx", buffer);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Alta masiva de Productores</h1>
          <p className="text-sm text-muted-foreground">
            Pega filas desde Excel, valida y crea hasta 100 registros por lote.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/producers">
            <ArrowLeft className="h-4 w-4" />
            Volver a productores
          </Link>
        </Button>
      </div>

      <SpreadsheetBatchEditor<AdminProductorBatchRowInput>
        entityLabel="Productores"
        columns={PRODUCTOR_COLUMNS}
        maxRows={100}
        submitLabel="Crear productores"
        submitting={creating}
        externalError={error}
        onSubmit={handleCreateBatch}
      />

      {createdRows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Credenciales temporales generadas</CardTitle>
              <Button variant="outline" size="sm" onClick={handleDownloadCredentials}>
                <Download className="h-4 w-4" />
                Descargar Excel
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
