"use client";

import { useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Search, Eye } from "lucide-react";
import { SanitarioBadge } from "./SanitarioBadge";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";

interface Props {
  bovinos: Bovino[];
  onSelect: (bovino: Bovino) => void;
}

export function BovinoList({ bovinos, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = bovinos.filter((b) => {
    const matchSearch =
      b.arete.toLowerCase().includes(search.toLowerCase()) ||
      b.raza.toLowerCase().includes(search.toLowerCase()) ||
      b.rancho.toLowerCase().includes(search.toLowerCase()) ||
      b.productor.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || b.sanitario.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-4">
      <Card className="py-4">
        <CardContent className="py-0">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por arete, raza, rancho o productor..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado sanitario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="limpio">Limpio</SelectItem>
                <SelectItem value="cuarentena">Cuarentena</SelectItem>
                <SelectItem value="reactor">Reactor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arete</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Raza</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Nacimiento</TableHead>
                <TableHead>Rancho</TableHead>
                <TableHead>Productor</TableHead>
                <TableHead>Estado Sanitario</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No se encontraron bovinos.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-medium">{b.arete}</TableCell>
                    <TableCell>{b.sexo}</TableCell>
                    <TableCell>{b.raza}</TableCell>
                    <TableCell>{b.peso}</TableCell>
                    <TableCell className="text-muted-foreground">{b.nacimiento}</TableCell>
                    <TableCell>{b.rancho}</TableCell>
                    <TableCell className="text-muted-foreground">{b.productor}</TableCell>
                    <TableCell><SanitarioBadge estado={b.sanitario} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => onSelect(b)}>
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
    </div>
  );
}
