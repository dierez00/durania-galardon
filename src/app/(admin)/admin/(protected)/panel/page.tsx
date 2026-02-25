import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";

export default function AdminPanelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de administracion</h1>
        <p className="text-sm text-muted-foreground">
          Zona administrativa para gestion de usuarios y configuracion de accesos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones rapidas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/admin/users">Gestionar usuarios</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Ir a panel tenant</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
