import type { DocumentProgress } from "../../domain/entities/DocumentProgressEntity";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { CheckCircle2, Circle, XCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toneClass } from "@/shared/ui/theme";

interface Props {
  progress: DocumentProgress;
}

export function DocumentProgressIndicator({ progress }: Props) {
  const statusIcon = (status: "completed" | "uploaded" | "pending" | "expired" | "rejected") => {
    if (status === "completed") {
      return <CheckCircle2 className={cn("h-4 w-4", toneClass("success", "icon"))} />;
    }
    if (status === "uploaded") {
      return <Clock className={cn("h-4 w-4", toneClass("info", "icon"))} />;
    }
    if (status === "expired") {
      return <AlertCircle className={cn("h-4 w-4", toneClass("warning", "icon"))} />;
    }
    if (status === "rejected") {
      return <XCircle className={cn("h-4 w-4", toneClass("error", "icon"))} />;
    }

    return <Circle className={cn("h-4 w-4", toneClass("neutral", "icon"))} />;
  };

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
            className="bg-secondary/60 [&>[data-slot='progress-indicator']]:bg-success"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            {statusIcon("completed")}
            <span>Completados: {progress.completed}</span>
          </div>
          <div className="flex items-center gap-2">
            {statusIcon("uploaded")}
            <span>En revisión: {progress.uploaded}</span>
          </div>
          <div className="flex items-center gap-2">
            {statusIcon("pending")}
            <span>Pendientes: {progress.pending}</span>
          </div>
          <div className="flex items-center gap-2">
            {statusIcon("expired")}
            <span>Vencidos: {progress.expired}</span>
          </div>
          <div className="flex items-center gap-2">
            {statusIcon("rejected")}
            <span>Rechazados: {progress.rejected}</span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium">Documentos Personales Requeridos</h4>
          {progress.items
            .filter((item) => item.level === "personal")
            .map((item) => (
              <div
                key={`${item.level}-${item.documentKey}-${item.uppId ?? "global"}`}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  {statusIcon(item.status)}
                  <span>{item.documentName}</span>
                </div>
              </div>
            ))}

          {progress.items.some((item) => item.level === "upp") && (
            <>
              <h4 className="text-sm font-medium mt-4">Documentos del Proyecto Requeridos</h4>
              {progress.items
                .filter((item) => item.level === "upp")
                .map((item) => (
                  <div
                    key={`${item.level}-${item.documentKey}-${item.uppId ?? "global"}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {statusIcon(item.status)}
                      <span>{item.documentName}</span>
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
