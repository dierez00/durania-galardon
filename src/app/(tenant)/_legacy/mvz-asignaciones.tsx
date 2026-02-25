import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const assignments = [
  { upp: "Rancho El Potrero", municipio: "Chihuahua", status: "Activa" },
  { upp: "Rancho San Miguel", municipio: "Aldama", status: "Activa" },
  { upp: "Rancho Las Palmas", municipio: "Delicias", status: "En revision" },
];

export default function MvzAssignmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis asignaciones MVZ</h1>
        <p className="text-sm text-muted-foreground">
          Vista de ranchos/UPP asignadas al perfil MVZ dentro del tenant actual.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {assignments.map((assignment) => (
          <Card key={assignment.upp}>
            <CardHeader>
              <CardTitle className="text-base">{assignment.upp}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Municipio: {assignment.municipio}</p>
              <p>Estado: {assignment.status}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
