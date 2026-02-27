"use client";

import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import type { NormativaSetting } from "@/modules/admin/normativa/domain/entities/NormativaSettingEntity";

interface Props {
  settings: NormativaSetting[];
}

export function NormativaList({ settings }: Readonly<Props>) {
  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clave</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vigente desde</TableHead>
              <TableHead>Vigente hasta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No hay configuraciones normativas.
                </TableCell>
              </TableRow>
            ) : (
              settings.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm font-medium">{s.key}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {JSON.stringify(s.value_json)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`border-0 ${
                        s.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.status === "active" ? "Activa" : "Vencida"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(s.effective_from).toLocaleDateString("es-MX")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.effective_until
                      ? new Date(s.effective_until).toLocaleDateString("es-MX")
                      : "Indefinida"}
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
