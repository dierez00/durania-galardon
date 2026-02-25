import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const modules = [
  {
    title: "Membresias",
    description: "Alta/baja de miembros del tenant y estado activo/inactivo.",
    endpoint: "GET/POST /api/tenant/iam/memberships",
  },
  {
    title: "Roles tenant",
    description: "Subroles personalizados por tenant y prioridad de herencia.",
    endpoint: "GET/POST/PATCH /api/tenant/iam/roles",
  },
  {
    title: "Permisos de rol",
    description: "Asignacion de permisos por subrol tenant.",
    endpoint: "PUT /api/tenant/iam/roles/:id/permissions",
  },
  {
    title: "Accesos UPP y MVZ",
    description: "Control operativo de accesos por UPP y asignaciones MVZ.",
    endpoint: "POST /api/tenant/upp-access | POST /api/tenant/mvz-assignments",
  },
  {
    title: "Citas CRM",
    description: "Seguimiento de citas de landing sin alta automatica de productor.",
    endpoint: "GET/PATCH /api/tenant/appointments",
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tenant IAM y Operacion</h1>
        <p className="text-sm text-muted-foreground">
          Configuracion central de membresias, subroles, permisos y flujo CRM de citas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((module) => (
          <Card key={module.title}>
            <CardHeader>
              <CardTitle className="text-base">{module.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{module.description}</p>
              <p className="rounded-md bg-muted p-2 font-mono text-xs text-foreground">
                {module.endpoint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
