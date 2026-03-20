"use client";

import Link from "next/link";
import { MapPin, MapPinOff } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { ProducerUpp } from "@/modules/producer/ranchos/domain/entities/ProducerUppEntity";
import { buildMapHref, statusBadgeClass, statusLabel } from "./utils/cardHelpers";

interface ProducerUppsListProps {
  readonly upps: ProducerUpp[];
}

export function ProducerUppsList({ upps }: ProducerUppsListProps) {
  return (
    <Table className="ml-4 mr-4">
          <TableHeader>
            <TableRow>
              <TableHead>UPP</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead className="text-right">Hectáreas</TableHead>
              <TableHead className="text-right">Límite Hato</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Mapa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upps.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  No se encontraron ranchos.
                </TableCell>
              </TableRow>
            ) : (
              upps.map((upp) => {
                const mapHref = buildMapHref(upp);
                return (
                  <TableRow key={upp.id} className="group">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <Link
                        href={`/producer/projects/${upp.id}`}
                        className="hover:text-foreground hover:underline transition-colors"
                      >
                        {upp.upp_code ?? upp.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/producer/projects/${upp.id}`}
                        className="font-medium hover:underline"
                      >
                        {upp.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-48 truncate">
                      {upp.address_text ?? <span className="italic">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {upp.hectares_total != null ? upp.hectares_total : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {upp.herd_limit != null ? upp.herd_limit : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`border ${statusBadgeClass(upp.status)}`}>
                        {statusLabel(upp.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {mapHref ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title={
                            upp.location_lat != null
                              ? "Ver coordenadas GPS en Maps"
                              : "Ver dirección en Maps"
                          }
                        >
                          <a href={mapHref} target="_blank" rel="noopener noreferrer">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                          </a>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" disabled title="Sin ubicación registrada">
                          <MapPinOff className="w-4 h-4 text-muted-foreground/40" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
    </Table>
  );
}
