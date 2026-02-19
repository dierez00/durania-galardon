"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestTube, ShieldAlert, Ship, Clock, CheckCircle } from "lucide-react";

const notifications = [
  {
    id: 1,
    tipo: "prueba",
    titulo: "Prueba sanitaria pendiente de revision",
    descripcion: "La prueba realizada en Rancho Las Palmas el 15/08/2024 requiere revision y aprobacion.",
    fecha: "Hace 2 horas",
    leida: false,
  },
  {
    id: 2,
    tipo: "cuarentena",
    titulo: "Cuarentena proxima a vencer",
    descripcion: "La cuarentena del bovino MX-4521-8892 en Rancho El Potrero vence el 22/08/2024.",
    fecha: "Hace 4 horas",
    leida: false,
  },
  {
    id: 3,
    tipo: "exportacion",
    titulo: "Solicitud de exportacion en revision",
    descripcion: "La solicitud de exportacion de MX-6720-3345 esta pendiente de aprobacion.",
    fecha: "Hace 6 horas",
    leida: false,
  },
  {
    id: 4,
    tipo: "prueba",
    titulo: "Resultado de prueba disponible",
    descripcion: "Los resultados de la prueba en Rancho Los Alamos estan disponibles para revision.",
    fecha: "Hace 8 horas",
    leida: true,
  },
  {
    id: 5,
    tipo: "cuarentena",
    titulo: "Evaluacion de cuarentena programada",
    descripcion: "La evaluacion intermedia del bovino MX-8901-1120 esta programada para manana.",
    fecha: "Hace 12 horas",
    leida: true,
  },
  {
    id: 6,
    tipo: "exportacion",
    titulo: "Exportacion aprobada",
    descripcion: "La solicitud de exportacion de MX-4521-8890 y MX-4521-8891 ha sido aprobada.",
    fecha: "Hace 1 dia",
    leida: true,
  },
  {
    id: 7,
    tipo: "prueba",
    titulo: "Nueva campana sanitaria asignada",
    descripcion: "Se ha asignado una nueva campana de vacunacion para el municipio de Delicias.",
    fecha: "Hace 2 dias",
    leida: true,
  },
];

function getIcon(tipo: string) {
  switch (tipo) {
    case "prueba":
      return <TestTube className="w-5 h-5 text-purple-600" />;
    case "cuarentena":
      return <ShieldAlert className="w-5 h-5 text-amber-600" />;
    case "exportacion":
      return <Ship className="w-5 h-5 text-blue-600" />;
    default:
      return <Clock className="w-5 h-5 text-gray-600" />;
  }
}

function getBg(tipo: string) {
  switch (tipo) {
    case "prueba": return "bg-purple-50";
    case "cuarentena": return "bg-amber-50";
    case "exportacion": return "bg-blue-50";
    default: return "bg-gray-50";
  }
}

function NotificationCard({ n }: { n: typeof notifications[0] }) {
  return (
    <div className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${!n.leida ? "bg-primary/5 border-primary/20" : "border-border"}`}>
      <div className={`p-2 rounded-lg shrink-0 ${getBg(n.tipo)}`}>
        {getIcon(n.tipo)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${!n.leida ? "font-semibold" : "font-medium"}`}>{n.titulo}</p>
          {!n.leida && <Badge className="bg-primary text-primary-foreground border-0 shrink-0 text-[10px]">Nueva</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{n.descripcion}</p>
        <p className="text-xs text-muted-foreground/60 mt-2">{n.fecha}</p>
      </div>
    </div>
  );
}

export default function NotificacionesPage() {
  const noLeidas = notifications.filter((n) => !n.leida);
  const leidas = notifications.filter((n) => n.leida);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro de notificaciones y alertas del sistema</p>
        </div>
        <Button variant="outline" size="sm">
          <CheckCircle className="w-4 h-4 mr-2" />
          Marcar todas como leidas
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="py-4">
          <CardContent className="py-0 flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><TestTube className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Pruebas Pendientes</p>
              <p className="text-lg font-bold">2</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="py-0 flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg"><ShieldAlert className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Cuarentenas Activas</p>
              <p className="text-lg font-bold">3</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="py-0 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Ship className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Exportaciones Pendientes</p>
              <p className="text-lg font-bold">2</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="todas">
        <TabsList>
          <TabsTrigger value="todas">Todas ({notifications.length})</TabsTrigger>
          <TabsTrigger value="no-leidas">No leidas ({noLeidas.length})</TabsTrigger>
          <TabsTrigger value="leidas">Leidas ({leidas.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="todas">
          <div className="space-y-3">
            {notifications.map((n) => (
              <NotificationCard key={n.id} n={n} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="no-leidas">
          <div className="space-y-3">
            {noLeidas.map((n) => (
              <NotificationCard key={n.id} n={n} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="leidas">
          <div className="space-y-3">
            {leidas.map((n) => (
              <NotificationCard key={n.id} n={n} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
