"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserCheck,
  MapPin,
  TestTube,
  ShieldAlert,
  Ship,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Bug as Cow,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const stats = [
  {
    title: "Productores",
    value: "1,248",
    change: "+12%",
    trend: "up",
    icon: UserCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Ranchos",
    value: "2,847",
    change: "+8%",
    trend: "up",
    icon: MapPin,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Bovinos",
    value: "45,632",
    change: "+15%",
    trend: "up",
    icon: Cow,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    title: "Pruebas Realizadas",
    value: "3,456",
    change: "+22%",
    trend: "up",
    icon: TestTube,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Cuarentenas Activas",
    value: "23",
    change: "-5%",
    trend: "down",
    icon: ShieldAlert,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    title: "Exportaciones en Proceso",
    value: "156",
    change: "+18%",
    trend: "up",
    icon: Ship,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
];

const monthlyData = [
  { mes: "Ene", pruebas: 280, exportaciones: 45 },
  { mes: "Feb", pruebas: 320, exportaciones: 52 },
  { mes: "Mar", pruebas: 290, exportaciones: 48 },
  { mes: "Abr", pruebas: 410, exportaciones: 65 },
  { mes: "May", pruebas: 380, exportaciones: 58 },
  { mes: "Jun", pruebas: 450, exportaciones: 72 },
  { mes: "Jul", pruebas: 520, exportaciones: 85 },
  { mes: "Ago", pruebas: 480, exportaciones: 78 },
];

const statusData = [
  { name: "Negativo", value: 78, color: "#16a34a" },
  { name: "Positivo", value: 8, color: "#dc2626" },
  { name: "Pendiente", value: 14, color: "#f59e0b" },
];

const trendData = [
  { mes: "Mar", bovinos: 38200 },
  { mes: "Abr", bovinos: 39800 },
  { mes: "May", bovinos: 41500 },
  { mes: "Jun", bovinos: 42800 },
  { mes: "Jul", bovinos: 44100 },
  { mes: "Ago", bovinos: 45632 },
];

const recentActivity = [
  {
    id: 1,
    tipo: "Prueba Sanitaria",
    descripcion: "Prueba TB/BR completada - Rancho El Potrero",
    usuario: "MVZ. Ana Garcia",
    fecha: "Hace 2 horas",
    estado: "Completada",
  },
  {
    id: 2,
    tipo: "Exportacion",
    descripcion: "Solicitud de exportacion #EXP-2024-0892",
    usuario: "Ventanilla - Maria Lopez",
    fecha: "Hace 3 horas",
    estado: "En proceso",
  },
  {
    id: 3,
    tipo: "Alta Bovino",
    descripcion: "15 bovinos registrados - Rancho Las Palmas",
    usuario: "Productor - Juan Perez",
    fecha: "Hace 5 horas",
    estado: "Registrado",
  },
  {
    id: 4,
    tipo: "Cuarentena",
    descripcion: "Cuarentena iniciada - Arete MX-4521-8890",
    usuario: "MVZ. Roberto Diaz",
    fecha: "Hace 6 horas",
    estado: "Activa",
  },
  {
    id: 5,
    tipo: "Prueba Sanitaria",
    descripcion: "Resultado pendiente - Rancho San Miguel",
    usuario: "MVZ. Ana Garcia",
    fecha: "Hace 8 horas",
    estado: "Pendiente",
  },
];

function getStatusBadge(estado: string) {
  switch (estado) {
    case "Completada":
      return <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">{estado}</Badge>;
    case "En proceso":
      return <Badge className="bg-blue-100 text-blue-700 border-0 hover:bg-blue-100">{estado}</Badge>;
    case "Registrado":
      return <Badge className="bg-gray-100 text-gray-700 border-0 hover:bg-gray-100">{estado}</Badge>;
    case "Activa":
      return <Badge className="bg-red-100 text-red-700 border-0 hover:bg-red-100">{estado}</Badge>;
    case "Pendiente":
      return <Badge className="bg-amber-100 text-amber-700 border-0 hover:bg-amber-100">{estado}</Badge>;
    default:
      return <Badge variant="secondary">{estado}</Badge>;
  }
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumen general del sistema de control ganadero
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="py-4">
            <CardContent className="py-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        stat.trend === "up"
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {stat.change} vs mes anterior
                    </span>
                  </div>
                </div>
                <div className={`${stat.bg} p-2.5 rounded-xl`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pruebas y Exportaciones Mensuales</CardTitle>
            <CardDescription>Actividad de los ultimos 8 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="pruebas" fill="#16a34a" radius={[4, 4, 0, 0]} name="Pruebas" />
                  <Bar dataKey="exportaciones" fill="#2563eb" radius={[4, 4, 0, 0]} name="Exportaciones" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado Sanitario</CardTitle>
            <CardDescription>Resultados de pruebas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name} ({item.value}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Crecimiento de Hato</CardTitle>
                <CardDescription>Bovinos registrados</CardDescription>
              </div>
              <div className="flex items-center gap-1 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">+19.5%</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="bovinos"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ fill: "#16a34a", r: 3 }}
                    name="Bovinos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent activity table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Actividad Reciente</CardTitle>
                <CardDescription>Ultimos movimientos del sistema</CardDescription>
              </div>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-xs">{item.tipo}</TableCell>
                    <TableCell className="text-xs">{item.descripcion}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.usuario}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.fecha}</TableCell>
                    <TableCell>{getStatusBadge(item.estado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
