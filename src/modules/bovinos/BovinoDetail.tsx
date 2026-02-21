import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SanitarioBadge } from "./SanitarioBadge";
import type { Bovino } from "@/core/data/dataBovinos";

interface Props {
  bovino: Bovino;
  onBack: () => void;
}

export function BovinoDetail({ bovino, onBack }: Props) {
  const stats = [
    { label: "Arete", value: bovino.arete },
    { label: "Sexo", value: bovino.sexo },
    { label: "Raza", value: bovino.raza },
    { label: "Peso", value: `${bovino.peso} kg` },
    { label: "Nacimiento", value: bovino.nacimiento },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>Volver al listado</Button>
        <div>
          <h1 className="text-2xl font-bold">Bovino {bovino.arete}</h1>
          <p className="text-sm text-muted-foreground">{bovino.rancho} - {bovino.productor}</p>
        </div>
        <SanitarioBadge estado={bovino.sanitario} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="py-4">
            <CardContent className="py-0">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-sm font-bold mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pruebas">
        <TabsList>
          <TabsTrigger value="pruebas">Historial de Pruebas</TabsTrigger>
          <TabsTrigger value="cuarentenas">Cuarentenas</TabsTrigger>
          <TabsTrigger value="exportaciones">Exportaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="pruebas">
          <Card>
            <CardContent className="pt-6">
              {bovino.pruebas?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tuberculosis</TableHead>
                      <TableHead>Brucelosis</TableHead>
                      <TableHead>MVZ</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bovino.pruebas.map((p) => (
                      <TableRow key={p.fecha}>
                        <TableCell>{p.fecha}</TableCell>
                        <TableCell><SanitarioBadge estado={p.tuberculosis} /></TableCell>
                        <TableCell><SanitarioBadge estado={p.brucelosis} /></TableCell>
                        <TableCell>{p.mvz}</TableCell>
                        <TableCell><SanitarioBadge estado={p.resultado} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No hay pruebas registradas.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cuarentenas">
          <Card>
            <CardContent className="pt-6">
              {bovino.cuarentenas?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bovino.cuarentenas.map((c) => (
                      <TableRow key={c.inicio}>
                        <TableCell>{c.inicio}</TableCell>
                        <TableCell>{c.motivo}</TableCell>
                        <TableCell><SanitarioBadge estado={c.estado} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Este bovino no tiene cuarentenas registradas.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exportaciones">
          <Card>
            <CardContent className="pt-6">
              {bovino.exportaciones?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Solicitud</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bovino.exportaciones.map((e) => (
                      <TableRow key={e.solicitud}>
                        <TableCell className="font-mono">{e.solicitud}</TableCell>
                        <TableCell>{e.fecha}</TableCell>
                        <TableCell>{e.destino}</TableCell>
                        <TableCell><SanitarioBadge estado={e.estado} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No hay exportaciones registradas.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
