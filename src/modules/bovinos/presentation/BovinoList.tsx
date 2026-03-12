"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Eye } from "lucide-react";
import { SanitarioBadge } from "./SanitarioBadge";
import { PruebaStatusBadge } from "./PruebaStatusBadge";
import { ExportableCheckBadge } from "./ExportableCheckBadge";
import { exportabilityReason } from "@/modules/bovinos/domain/services/checkExportability";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";

interface Props {
  readonly bovinos: Bovino[];
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BovinoList({ bovinos }: Props) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arete SINIIGA</TableHead>
              <TableHead>Sexo</TableHead>
              <TableHead>Rancho</TableHead>
              <TableHead>Nacimiento</TableHead>
              <TableHead className="text-center">TB</TableHead>
              <TableHead className="text-center">BR</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Exportable</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bovinos.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-10"
                >
                  No se encontraron bovinos.
                </TableCell>
              </TableRow>
            ) : (
              bovinos.map((b) => (
                <TableRow key={b.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono font-semibold text-sm">
                    {b.siniiga_tag}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.sex === "M" ? "Macho" : "Hembra"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="font-medium">{b.upp_name}</span>
                    {b.upp_code && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({b.upp_code})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(b.birth_date)}
                  </TableCell>
                  <TableCell className="text-center">
                    <PruebaStatusBadge
                      status={b.sanitary.tb_status}
                      result={b.sanitary.tb_result}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <PruebaStatusBadge
                      status={b.sanitary.br_status}
                      result={b.sanitary.br_result}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <SanitarioBadge
                      estado={b.sanitary.sanitary_alert ?? b.status}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <ExportableCheckBadge
                      canExport={b.canExport}
                      reason={b.canExport ? undefined : exportabilityReason(b)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/producer/bovinos/${b.id}`)}
                      title="Ver detalle del bovino"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
