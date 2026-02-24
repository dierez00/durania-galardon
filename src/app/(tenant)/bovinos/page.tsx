"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Plus } from "lucide-react";
import { BovinoList, BovinoDetail, listBovinos } from "@/modules/bovinos";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";
import { mockBovinoRepository } from "@/modules/bovinos/infra/mock/MockBovinoRepository";

const bovinos = listBovinos(mockBovinoRepository);

export default function BovinosPage() {
  const [selected, setSelected] = useState<Bovino | null>(null);
  const [openNew, setOpenNew] = useState(false);

  return (
    <div className="space-y-6">
      {!selected ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Bovinos</h1>
              <p className="text-sm text-muted-foreground mt-1">Registro y gestion de ganado bovino</p>
            </div>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Alta de Bovino</Button>
              </DialogTrigger>
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
          </div>
          <BovinoList bovinos={bovinos} onSelect={setSelected} />
        </>
      ) : (
        <BovinoDetail bovino={selected} onBack={() => setSelected(null)} />
      )}
    </div>
  );
}
