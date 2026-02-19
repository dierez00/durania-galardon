"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Eye, Pencil, FileText, MapPin, History } from "lucide-react";

const productores = [
  { id: 1, nombre: "Juan Perez Ramirez", curp: "PERJ800515HCHRM09", rfc: "PERJ800515XX1", municipio: "Chihuahua", ranchos: 3, bovinos: 245, estado: "Activo" },
  { id: 2, nombre: "Pedro Gomez Torres", curp: "GOTP750320HCHM08", rfc: "GOTP750320YY2", municipio: "Delicias", ranchos: 2, bovinos: 180, estado: "Activo" },
  { id: 3, nombre: "Miguel Angel Ruiz", curp: "RUIM880910HCHR05", rfc: "RUIM880910ZZ3", municipio: "Cuauhtemoc", ranchos: 1, bovinos: 95, estado: "Activo" },
  { id: 4, nombre: "Roberto Hernandez", curp: "HERR700101HCHR06", rfc: "HERR700101AA4", municipio: "Juarez", ranchos: 4, bovinos: 520, estado: "Activo" },
  { id: 5, nombre: "Francisco Lopez Mendez", curp: "LOMF650825HCHL07", rfc: "LOMF650825BB5", municipio: "Parral", ranchos: 2, bovinos: 310, estado: "Inactivo" },
  { id: 6, nombre: "Alberto Castillo Vega", curp: "CAVA720415HCHV08", rfc: "CAVA720415CC6", municipio: "Camargo", ranchos: 1, bovinos: 78, estado: "Activo" },
];

const [selectedDetail] = [productores[0]];

export default function ProductoresPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [openNew, setOpenNew] = useState(false);

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Productores</h1>
              <p className="text-sm text-muted-foreground mt-1">Gestion completa de productores ganaderos</p>
            </div>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Alta de Productor</Button>
              </DialogTrigger>
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
          </div>

          <Card className="py-4">
            <CardContent className="py-0">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nombre, CURP o municipio..." className="pl-9" />
                </div>
                <Button variant="outline">Filtros</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>CURP</TableHead>
                    <TableHead>Municipio</TableHead>
                    <TableHead className="text-center">Ranchos</TableHead>
                    <TableHead className="text-center">Bovinos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productores.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{p.curp}</TableCell>
                      <TableCell>{p.municipio}</TableCell>
                      <TableCell className="text-center">{p.ranchos}</TableCell>
                      <TableCell className="text-center">{p.bovinos}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${p.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{p.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setView("detail")}><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
