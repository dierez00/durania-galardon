"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { FileText, MapPin, History } from "lucide-react";
import {
  ProductoresFilters,
  ProductoresList,
  listProductores,
  filterProductoresUseCase,
  type ProductoresFiltersState,
} from "@/modules/productores";
import { mockProductoresRepository } from "@/modules/productores/infra/mock";
import type { Productor } from "@/modules/productores/domain/entities/ProductoresEntity";

const allProductores = listProductores(mockProductoresRepository);

export default function ProductoresPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [openNew, setOpenNew] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<Productor>(allProductores[0]);
  const [filters, setFilters] = useState<ProductoresFiltersState>({
    search: "",
    municipio: "",
    estado: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const filteredProductores = useMemo(
    () => filterProductoresUseCase(allProductores, filters),
    [filters]
  );

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div>
            <h1 className="text-2xl font-bold">Productores</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestion completa de productores ganaderos</p>
          </div>

          <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Alta de Nuevo Productor</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nombre Completo</Label><Input placeholder="Nombre completo" /></div>
                    <div className="space-y-2"><Label>CURP</Label><Input placeholder="CURP del productor" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>RFC</Label><Input placeholder="RFC" /></div>
                    <div className="space-y-2"><Label>Telefono</Label><Input placeholder="Telefono de contacto" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Municipio</Label><Input placeholder="Municipio" /></div>
                    <div className="space-y-2"><Label>Correo Electronico</Label><Input type="email" placeholder="correo@ejemplo.com" /></div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Documentos</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {["INE (frente y vuelta)", "CURP", "Comprobante de domicilio", "Escritura del rancho"].map((doc) => (
                        <div key={doc} className="border border-dashed rounded-lg p-3 text-center text-sm text-muted-foreground hover:border-primary/50 cursor-pointer transition-colors">
                          <FileText className="w-5 h-5 mx-auto mb-1 text-muted-foreground/60" />
                          {doc}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                    <Button onClick={() => setOpenNew(false)}>Registrar Productor</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

          <ProductoresFilters
            filters={filters}
            onFiltersChange={setFilters}
            onAddProductor={() => setOpenNew(true)}
          />

          <ProductoresList
            productores={filteredProductores}
            onView={(p) => { setSelectedDetail(p); setView("detail"); }}
          />
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setView("list")}>Volver al listado</Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedDetail.nombre}</h1>
              <p className="text-sm text-muted-foreground">{selectedDetail.curp}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="py-4">
              <CardContent className="py-0 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><MapPin className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Ranchos</p>
                  <p className="text-xl font-bold">{selectedDetail.ranchos}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="py-0 flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg"><span className="text-amber-600 font-bold text-lg">B</span></div>
                <div>
                  <p className="text-sm text-muted-foreground">Bovinos</p>
                  <p className="text-xl font-bold">{selectedDetail.bovinos}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="py-0 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg"><History className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Municipio</p>
                  <p className="text-xl font-bold">{selectedDetail.municipio}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info">Informacion</TabsTrigger>
              <TabsTrigger value="docs">Documentos</TabsTrigger>
              <TabsTrigger value="ranchos">Ranchos</TabsTrigger>
              <TabsTrigger value="historial">Historial Sanitario</TabsTrigger>
            </TabsList>
            <TabsContent value="info">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div><Label className="text-muted-foreground">Nombre</Label><p className="font-medium mt-1">{selectedDetail.nombre}</p></div>
                    <div><Label className="text-muted-foreground">CURP</Label><p className="font-medium font-mono mt-1">{selectedDetail.curp}</p></div>
                    <div><Label className="text-muted-foreground">RFC</Label><p className="font-medium font-mono mt-1">{selectedDetail.rfc}</p></div>
                    <div><Label className="text-muted-foreground">Municipio</Label><p className="font-medium mt-1">{selectedDetail.municipio}</p></div>
                    <div><Label className="text-muted-foreground">Telefono</Label><p className="font-medium mt-1">(614) 555-0123</p></div>
                    <div><Label className="text-muted-foreground">Correo</Label><p className="font-medium mt-1">juan.perez@correo.com</p></div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="docs">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: "INE", status: "Verificado" },
                      { name: "CURP", status: "Verificado" },
                      { name: "Comprobante de Domicilio", status: "Pendiente" },
                      { name: "Escritura del Rancho", status: "Verificado" },
                    ].map((doc) => (
                      <div key={doc.name} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <Badge className={`mt-1 border-0 text-[10px] ${doc.status === "Verificado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{doc.status}</Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Ver</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="ranchos">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Municipio</TableHead>
                        <TableHead>Bovinos</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow><TableCell className="font-medium">Rancho El Potrero</TableCell><TableCell>Chihuahua</TableCell><TableCell>120</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Activo</Badge></TableCell></TableRow>
                      <TableRow><TableCell className="font-medium">Rancho Las Palmas</TableCell><TableCell>Chihuahua</TableCell><TableCell>85</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Activo</Badge></TableCell></TableRow>
                      <TableRow><TableCell className="font-medium">Rancho San Miguel</TableCell><TableCell>Aldama</TableCell><TableCell>40</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Activo</Badge></TableCell></TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="historial">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Rancho</TableHead>
                        <TableHead>MVZ</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow><TableCell>2024-08-10</TableCell><TableCell>Tuberculosis</TableCell><TableCell>El Potrero</TableCell><TableCell>MVZ. Ana Garcia</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge></TableCell></TableRow>
                      <TableRow><TableCell>2024-08-10</TableCell><TableCell>Brucelosis</TableCell><TableCell>El Potrero</TableCell><TableCell>MVZ. Ana Garcia</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge></TableCell></TableRow>
                      <TableRow><TableCell>2024-06-15</TableCell><TableCell>Tuberculosis</TableCell><TableCell>Las Palmas</TableCell><TableCell>MVZ. Roberto Diaz</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">Negativo</Badge></TableCell></TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
