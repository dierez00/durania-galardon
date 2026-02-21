import {
  UserCheck,
  MapPin,
  TestTube,
  ShieldAlert,
  Ship,
  Bug as Cow,
} from "lucide-react";

export const stats = [
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

export const monthlyData = [
  { mes: "Ene", pruebas: 280, exportaciones: 45 },
  { mes: "Feb", pruebas: 320, exportaciones: 52 },
  { mes: "Mar", pruebas: 290, exportaciones: 48 },
  { mes: "Abr", pruebas: 410, exportaciones: 65 },
  { mes: "May", pruebas: 380, exportaciones: 58 },
  { mes: "Jun", pruebas: 450, exportaciones: 72 },
  { mes: "Jul", pruebas: 520, exportaciones: 85 },
  { mes: "Ago", pruebas: 480, exportaciones: 78 },
];

export const statusData = [
  { name: "Negativo", value: 78, color: "#16a34a" },
  { name: "Positivo", value: 8, color: "#dc2626" },
  { name: "Pendiente", value: 14, color: "#f59e0b" },
];

export const trendData = [
  { mes: "Mar", bovinos: 38200 },
  { mes: "Abr", bovinos: 39800 },
  { mes: "May", bovinos: 41500 },
  { mes: "Jun", bovinos: 42800 },
  { mes: "Jul", bovinos: 44100 },
  { mes: "Ago", bovinos: 45632 },
];

export const recentActivity = [
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