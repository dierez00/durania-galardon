"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { resolveClientRole } from "@/shared/lib/auth-client";
import { MvzRanchProvider } from "@/modules/ranchos/presentation/mvz";
import { ProducerUppProvider } from "@/modules/producer/ranchos/presentation";
import { TenantWorkspaceProvider, TenantWorkspaceShell } from "@/modules/workspace";
import {
  MVZ_SETTINGS_NAV_PERMISSIONS,
  PRODUCER_SETTINGS_NAV_PERMISSIONS,
  resolvePanelHomePath,
  type PermissionKey,
} from "@/shared/lib/auth";

function resolveProducerPermissions(pathname: string): PermissionKey[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "producer") {
    return [];
  }

  if (segments.length === 1) {
    return ["producer.upp.read"];
  }

  if (segments[1] === "metrics" || segments[1] === "dashboard") {
    return ["producer.dashboard.read"];
  }

  if (segments[1] === "profile") {
    return [];
  }

  if (segments[1] === "settings" || segments[1] === "empleados") {
    return [...PRODUCER_SETTINGS_NAV_PERMISSIONS];
  }

  if (segments[1] === "ranchos") {
    return ["producer.upp.read"];
  }

  if (segments[1] === "bovinos") {
    return ["producer.bovinos.read"];
  }

  if (segments[1] === "movilizacion") {
    return ["producer.movements.read"];
  }

  if (segments[1] === "exportaciones") {
    return ["producer.exports.read"];
  }

  if (segments[1] === "documentos") {
    return ["producer.documents.read"];
  }

  if (segments[1] === "projects") {
    const moduleKey = segments[3] ?? "overview";

    if (moduleKey === "animales") {
      return ["producer.bovinos.read"];
    }

    if (moduleKey === "movilizacion") {
      return ["producer.movements.read"];
    }

    if (moduleKey === "exportaciones") {
      return ["producer.exports.read"];
    }

    if (moduleKey === "documentos") {
      return ["producer.documents.read"];
    }

    return ["producer.upp.read"];
  }

  return [];
}

function resolveMvzPermissions(pathname: string): PermissionKey[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "mvz") {
    return [];
  }

  if (segments.length === 1) {
    return ["mvz.assignments.read"];
  }

  if (segments[1] === "profile") {
    return [];
  }

  if (segments[1] === "metrics" || segments[1] === "dashboard") {
    return ["mvz.dashboard.read"];
  }

  if (segments[1] === "settings") {
    return [...MVZ_SETTINGS_NAV_PERMISSIONS];
  }

  if (segments[1] === "asignaciones") {
    return ["mvz.assignments.read"];
  }

  if (segments[1] === "pruebas") {
    return ["mvz.tests.read"];
  }

  if (segments[1] === "exportaciones") {
    return ["mvz.exports.read"];
  }

  if (segments[1] === "ranchos" && !segments[2]) {
    return ["mvz.assignments.read"];
  }

  if (segments[1] === "ranchos" && segments[2]) {
    const moduleKey = segments[3] ?? "overview";

    if (moduleKey === "animales") {
      return ["mvz.ranch.animals.read"];
    }

    if (moduleKey === "historial-clinico") {
      return ["mvz.ranch.clinical.read"];
    }

    if (moduleKey === "vacunacion") {
      return ["mvz.ranch.vaccinations.read"];
    }

    if (moduleKey === "incidencias") {
      return ["mvz.ranch.incidents.read"];
    }

    if (moduleKey === "reportes") {
      return ["mvz.ranch.reports.read"];
    }

    if (moduleKey === "documentacion") {
      return ["mvz.ranch.documents.read"];
    }

    if (moduleKey === "visitas") {
      return ["mvz.ranch.visits.read"];
    }

    return ["mvz.ranch.read"];
  }

  return [];
}

function resolvePermissionsForPath(
  pathname: string,
  panelType: "producer" | "mvz"
): PermissionKey[] {
  return panelType === "producer" ? resolveProducerPermissions(pathname) : resolveMvzPermissions(pathname);
}

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const panel = pathname.startsWith("/producer") ? "producer" : "mvz";

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          router.replace("/login");
          return;
        }

        const roleResult = await resolveClientRole(supabase, data.session.user.id);
        if (!roleResult.role) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (roleResult.panelType === "government") {
          router.replace("/admin");
          return;
        }

        if (roleResult.panelType === "producer" && !pathname.startsWith("/producer")) {
          router.replace("/producer");
          return;
        }

        if (roleResult.panelType === "mvz" && !pathname.startsWith("/mvz")) {
          router.replace("/mvz");
          return;
        }

        if (
          roleResult.panelType === "mvz" &&
          roleResult.isMvzInternal &&
          (pathname.startsWith("/mvz/settings") ||
            pathname.startsWith("/mvz/metrics") ||
            pathname.startsWith("/mvz/dashboard"))
        ) {
          router.replace("/mvz");
          return;
        }

        const rolePath = roleResult.panelType === "producer" ? "producer" : "mvz";
        const nextPanelType = roleResult.panelType ?? rolePath;
        const requiredPermissions = resolvePermissionsForPath(pathname, rolePath);
        const panelHomePath = resolvePanelHomePath({
          panelType: nextPanelType,
          permissions: roleResult.permissions ?? [],
          isMvzInternal: roleResult.isMvzInternal,
        });

        if (requiredPermissions.length === 0) {
          setReady(true);
          return;
        }

        const permissions: PermissionKey[] = roleResult.permissions ?? [];

        if (!requiredPermissions.some((permission) => permissions.includes(permission))) {
          if (pathname !== panelHomePath) {
            router.replace(panelHomePath);
            return;
          }

          router.replace(rolePath === "producer" ? "/producer/profile" : "/mvz/profile");
          return;
        }

        setReady(true);
      } catch {
        router.replace("/login");
      }
    };

    void run();
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Validando sesión...
      </div>
    );
  }

  return (
    <TenantWorkspaceProvider key={panel} panel={panel}>
      {panel === "producer" ? (
        <ProducerUppProvider>
          <TenantWorkspaceShell>{children}</TenantWorkspaceShell>
        </ProducerUppProvider>
      ) : (
        <MvzRanchProvider>
          <TenantWorkspaceShell>{children}</TenantWorkspaceShell>
        </MvzRanchProvider>
      )}
    </TenantWorkspaceProvider>
  );
}
