"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  BovinosFilters,
  BovinoList,
  BovinoDetail,
  listBovinos,
  filterBovinosUseCase,
  type BovinosFiltersState,
} from "@/modules/bovinos";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";
import { mockBovinoRepository } from "@/modules/bovinos/infra/mock/MockBovinoRepository";

const allBovinos = listBovinos(mockBovinoRepository);

export default function BovinosPage() {
  const [selected, setSelected] = useState<Bovino | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [filters, setFilters] = useState<BovinosFiltersState>({
    search: "",
    sexo: "",
    sanitario: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const filteredBovinos = useMemo(
    () => filterBovinosUseCase(allBovinos, filters),
    [filters]
  );

  return (
    <div className="space-y-6">
      {selected ? (
        <BovinoDetail bovino={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold">Bovinos</h1>
            <p className="text-sm text-muted-foreground mt-1">Registro y gestion de ganado bovino</p>
          </div>

          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Registrar Nuevo Bovino</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Numero de Arete</Label><Input placeholder="MX-XXXX-XXXX" /></div>
                  <div className="space-y-2">
                    <Label>Sexo</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="macho">Macho</SelectItem>
                        <SelectItem value="hembra">Hembra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Raza</Label><Input placeholder="Raza del bovino" /></div>
                  <div className="space-y-2"><Label>Peso (kg)</Label><Input type="number" placeholder="Peso en kilogramos" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Fecha de Nacimiento</Label><Input type="date" /></div>
                  <div className="space-y-2"><Label>Rancho</Label><Input placeholder="Buscar rancho..." /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                  <Button onClick={() => setOpenNew(false)}>Registrar Bovino</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <BovinosFilters
            filters={filters}
            onFiltersChange={setFilters}
            onAddBovino={() => setOpenNew(true)}
          />

          <BovinoList bovinos={filteredBovinos} onSelect={setSelected} />
        </>
      )}
    </div>
  );
}

