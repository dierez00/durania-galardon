import type { DocumentProgress } from "../../domain/entities/DocumentProgressEntity";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { CheckCircle2, Circle, XCircle, AlertCircle, Clock } from "lucide-react";

interface Props {
  progress: DocumentProgress;
}

export function DocumentProgressIndicator({ progress }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progreso de Documentación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Completitud del expediente</span>
            <span className="font-medium">{progress.percentComplete}%</span>
          </div>
          <Progress
            value={progress.percentComplete}
            className="bg-green-100 [&>[data-slot='progress-indicator']]:bg-green-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Completados: {progress.completed}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>En revisión: {progress.uploaded}</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-gray-400" />
            <span>Pendientes: {progress.pending}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span>Vencidos: {progress.expired}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span>Rechazados: {progress.rejected}</span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium">Documentos Requeridos</h4>
          {progress.items.map((item) => (
            <div
              key={`${item.level}-${item.documentKey}-${item.uppId ?? "global"}`}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {item.status === "completed" && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {item.status === "uploaded" && (
                  <Clock className="h-4 w-4 text-blue-500" />
                )}
                {item.status === "pending" && <Circle className="h-4 w-4 text-gray-400" />}
                {item.status === "expired" && (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
                {item.status === "rejected" && <XCircle className="h-4 w-4 text-red-600" />}
                <span>
                  {item.documentName}
                  {item.uppName && (
                    <span className="text-muted-foreground ml-1">({item.uppName})</span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
