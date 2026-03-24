"use client";

import { Home } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import { AdminMvzUppCard } from "./AdminMvzUppCard";
import { AdminMvzAvailableUppCard } from "./AdminMvzAvailableUppCard";
import type { UppSubTab } from "./hooks/useAdminMvzDetail";
import type {
  AdminMvzUpp,
  AdminMvzAvailableUpp,
} from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

interface AdminMvzUppsTabProps {
  upps: AdminMvzUpp[];
  loadingUpps: boolean;
  uppSubTab: UppSubTab;
  handleUppSubTabChange: (tab: UppSubTab) => void;
  availableUpps: AdminMvzAvailableUpp[];
  loadingAvailableUpps: boolean;
  uppPendingUnassign: string | null;
  setUppPendingUnassign: (id: string | null) => void;
  uppPendingAssign: string | null;
  setUppPendingAssign: (id: string | null) => void;
  isProcessingUpp: boolean;
  handleConfirmAssign: () => void;
  handleConfirmUnassign: () => void;
}

const SUB_TABS: { key: UppSubTab; label: (count: number) => string }[] = [
  { key: "asignados",   label: (n) => `Asignados (${n})` },
  { key: "disponibles", label: (_) => "Disponibles" },
];

export function AdminMvzUppsTab({
  upps,
  loadingUpps,
  uppSubTab,
  handleUppSubTabChange,
  availableUpps,
  loadingAvailableUpps,
  uppPendingUnassign,
  setUppPendingUnassign,
  uppPendingAssign,
  setUppPendingAssign,
  isProcessingUpp,
  handleConfirmAssign,
  handleConfirmUnassign,
}: Readonly<AdminMvzUppsTabProps>) {

  // ── Assigned content ───────────────────────────────────────────────────────
  function renderAssigned() {
    if (loadingUpps) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-40 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }
    if (upps.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Home className="w-10 h-10 opacity-30" />
          <p className="text-sm">Sin ranchos asignados.</p>
          <p className="text-xs">Cambia a &quot;Disponibles&quot; para asignar uno.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {upps.map((u) => (
          <AdminMvzUppCard
            key={u.id}
            upp={u}
            onUnassign={() => setUppPendingUnassign(u.id)}
          />
        ))}
      </div>
    );
  }

  // ── Available content ──────────────────────────────────────────────────────
  function renderAvailable() {
    if (loadingAvailableUpps) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-40 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }
    if (availableUpps.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Home className="w-10 h-10 opacity-30" />
          <p className="text-sm">No hay ranchos disponibles para asignar.</p>
          <p className="text-xs">Todos los ranchos activos ya tienen una asignación activa.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableUpps.map((u) => (
          <AdminMvzAvailableUppCard
            key={u.id}
            upp={u}
            onAssign={() => setUppPendingAssign(u.id)}
          />
        ))}
      </div>
    );
  }

  // ── Sub-tab bar ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-1 border-b border-border/60 pb-0">
        {SUB_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleUppSubTabChange(key)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-md transition-colors",
              uppSubTab === key
                ? "bg-background border border-b-background border-border/60 -mb-px text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            {label(upps.length)}
          </button>
        ))}
      </div>

      {uppSubTab === "asignados" && renderAssigned()}
      {uppSubTab === "disponibles" && renderAvailable()}

      {/* ── Confirm unassign dialog ────────────────────────────────────── */}
      <AlertDialog
        open={uppPendingUnassign !== null}
        onOpenChange={(open) => { if (!open) setUppPendingUnassign(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desasignar rancho</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas desasignar este rancho del MVZ? El rancho
              quedará disponible para ser asignado a otro MVZ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingUpp}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnassign}
              disabled={isProcessingUpp}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessingUpp ? "Desasignando..." : "Desasignar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm assign dialog ──────────────────────────────────────── */}
      <AlertDialog
        open={uppPendingAssign !== null}
        onOpenChange={(open) => { if (!open) setUppPendingAssign(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Asignar rancho</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas la asignación de este rancho al MVZ? El rancho dejará de
              aparecer en la lista de disponibles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingUpp}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAssign}
              disabled={isProcessingUpp}
            >
              {isProcessingUpp ? "Asignando..." : "Asignar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
