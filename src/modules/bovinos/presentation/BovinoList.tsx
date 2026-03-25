"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";
import { exportabilityReason } from "@/modules/bovinos/domain/services/checkExportability";
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
import { ExportableCheckBadge } from "./ExportableCheckBadge";
import { PruebaStatusBadge } from "./PruebaStatusBadge";
import { SanitarioBadge } from "./SanitarioBadge";

interface Props {
  readonly bovinos: Bovino[];
  readonly detailHrefBase?: string;
  readonly getDetailHref?: (bovino: Bovino) => string;
  readonly showUpp?: boolean;
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatHealthStatus(status: string | null): string {
  if (!status) return "-";
  if (status === "healthy") return "Sano";
  if (status === "observation") return "Observacion";
  if (status === "quarantine") return "Cuarentena";
  return status;
}

export function BovinoList({
  bovinos,
  detailHrefBase = "/producer/bovinos",
  getDetailHref,
  showUpp = true,
}: Props) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arete SINIIGA</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Sexo</TableHead>
              {showUpp ? <TableHead>Rancho</TableHead> : null}
              <TableHead>Nacimiento</TableHead>
              <TableHead>Salud</TableHead>
              <TableHead>Collar</TableHead>
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
                  colSpan={showUpp ? 12 : 11}
                  className="py-10 text-center text-muted-foreground"
                >
                  No se encontraron bovinos.
                </TableCell>
              </TableRow>
            ) : (
              bovinos.map((bovino) => {
                const detailHref = getDetailHref
                  ? getDetailHref(bovino)
                  : `${detailHrefBase}/${bovino.id}`;

                return (
                  <TableRow key={bovino.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-semibold">
                      {bovino.siniiga_tag}
                    </TableCell>
                    <TableCell className="text-sm">
                      <button
                        type="button"
                        className="text-left font-medium transition-colors hover:text-primary hover:underline"
                        onClick={() => router.push(detailHref)}
                      >
                        {bovino.name ?? "Sin nombre"}
                      </button>
                      <div className="text-xs text-muted-foreground">
                        {[bovino.breed, bovino.age_years != null ? `${bovino.age_years} ano(s)` : null]
                          .filter(Boolean)
                          .join(" / ") || "Sin perfil ampliado"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bovino.sex === "M" ? "Macho" : "Hembra"}
                    </TableCell>
                    {showUpp ? (
                      <TableCell className="text-sm">
                        <span className="font-medium">{bovino.upp_name}</span>
                        {bovino.upp_code ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({bovino.upp_code})
                          </span>
                        ) : null}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(bovino.birth_date)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{formatHealthStatus(bovino.health_status)}</div>
                      <div className="text-xs text-muted-foreground">
                        {bovino.weight_kg != null
                          ? `${bovino.weight_kg.toFixed(1)} kg`
                          : "Peso sin registro"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-mono">{bovino.current_collar_id ?? "Sin collar"}</div>
                      <div className="text-xs text-muted-foreground">
                        {bovino.current_collar_linked_at
                          ? `Vinculado ${formatDate(bovino.current_collar_linked_at)}`
                          : "Sin vinculo activo"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <PruebaStatusBadge
                        status={bovino.sanitary.tb_status}
                        result={bovino.sanitary.tb_result}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <PruebaStatusBadge
                        status={bovino.sanitary.br_status}
                        result={bovino.sanitary.br_result}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <SanitarioBadge estado={bovino.sanitary.sanitary_alert ?? bovino.status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ExportableCheckBadge
                        canExport={bovino.canExport}
                        reason={bovino.canExport ? undefined : exportabilityReason(bovino)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(detailHref)}
                        title="Ver detalle del bovino"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
