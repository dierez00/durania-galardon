"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { SpreadsheetBatchEditor } from "@/shared/ui/spreadsheet";
import { buildExcelBuffer, downloadExcel } from "@/shared/ui/spreadsheet/utils";
import type { SpreadsheetColumn } from "@/shared/ui/spreadsheet";
import type { AdminMvzBatchRowInput } from "@/modules/admin/mvz/domain/repositories/adminMvzRepository";
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
  const { creating, error, createdRows, handleCreateBatch } = useCreateAdminMvzBatch();

  const handleDownloadCredentials = () => {
    if (createdRows.length === 0) return;
    const buffer = buildExcelBuffer(
      ["Fila", "ID entidad", "Tenant", "Email", "Invitacion enviada"],
      createdRows.map((row) => [
        String(row.rowIndex + 1),
        row.entityId,
        row.tenantId,
        row.email,
        row.invitationSent ? "Si" : "No",
      ])
    );
    downloadExcel("mvz-invitaciones.xlsx", buffer);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Alta masiva de MVZ</h1>
          <p className="text-sm text-muted-foreground">
            Pega filas desde Excel o importa un archivo .xlsx para crear hasta 100 registros.
            Las cuentas nuevas recibiran una invitacion por correo para activar su acceso.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/mvz">
            <ArrowLeft className="h-4 w-4" />
            Volver a MVZ
          </Link>
        </Button>
      </div>

      <SpreadsheetBatchEditor<AdminMvzBatchRowInput>
        entityLabel="MVZ"
        columns={MVZ_COLUMNS}
        maxRows={100}
        submitLabel="Crear MVZ"
        submitting={creating}
        externalError={error}
        onSubmit={(rows) => handleCreateBatch(rows, "mvz_government")}
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
                  <TableHead>Invitacion enviada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {createdRows.map((row) => (
                  <TableRow key={`${row.entityId}-${row.rowIndex}`}>
                    <TableCell>{row.rowIndex + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{row.entityId}</TableCell>
                    <TableCell className="font-mono text-xs">{row.tenantId}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.invitationSent ? "Invitacion enviada" : "Asignado a cuenta existente"}</TableCell>
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
