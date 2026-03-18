"use client";

import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { AdminExportacionStatus } from "@/modules/admin/exportaciones/domain/entities/AdminExportacionEntity";

interface Step {
  key: AdminExportacionStatus | "start";
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { key: "requested", label: "Solicitada", description: "Solicitud creada por el productor" },
  { key: "mvz_validated", label: "Validada MVZ", description: "Revisada y validada por el médico veterinario" },
  { key: "final_approved", label: "Aprobada", description: "Aprobación final por administración" },
];

const TERMINAL_NEGATIVE = new Set<AdminExportacionStatus>(["blocked", "rejected"]);

interface Props {
  status: AdminExportacionStatus;
  blockedReason?: string | null;
}

function stepState(
  stepKey: AdminExportacionStatus,
  currentStatus: AdminExportacionStatus
): "done" | "active" | "pending" | "blocked" {
  if (TERMINAL_NEGATIVE.has(currentStatus)) return "blocked";
  const order = ["requested", "mvz_validated", "final_approved"];
  const currentIdx = order.indexOf(currentStatus);
  const stepIdx = order.indexOf(stepKey);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

function StepIcon({ state }: Readonly<{ state: "done" | "active" | "pending" | "blocked" }>) {
  if (state === "done") return <CheckCircle2 className="w-5 h-5 text-white" />;
  if (state === "active") return <Circle className="w-4 h-4 text-white fill-white" />;
  if (state === "blocked") return <XCircle className="w-4 h-4 text-red-400" />;
  return <Circle className="w-4 h-4 text-muted-foreground" />;
}

export function AdminExportacionProcesoTimeline({ status, blockedReason }: Readonly<Props>) {
  const isTerminalNegative = TERMINAL_NEGATIVE.has(status);

  return (
    <div className="p-4">
      {isTerminalNegative && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">
              {status === "blocked" ? "Exportación bloqueada" : "Exportación rechazada"}
            </p>
            {blockedReason && (
              <p className="text-sm text-red-600 mt-0.5">{blockedReason}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-start gap-0">
        {STEPS.map((step, idx) => {
          const state = stepState(step.key as AdminExportacionStatus, status);
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-start flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                    state === "done" && "bg-emerald-500 border-emerald-500",
                    state === "active" && "bg-primary border-primary",
                    state === "pending" && "bg-background border-border",
                    state === "blocked" && "bg-red-100 border-red-300"
                  )}
                >
                  <StepIcon state={state} />
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "h-0.5 w-full mt-3.5",
                      state === "done" ? "bg-emerald-500" : "bg-border"
                    )}
                    style={{ width: "100%" }}
                  />
                )}
              </div>
              <div className="ml-3 pb-6 flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    state === "active" && "text-primary",
                    state === "done" && "text-foreground",
                    state === "pending" && "text-muted-foreground",
                    state === "blocked" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
