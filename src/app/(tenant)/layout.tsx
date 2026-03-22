"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { resolveClientRole } from "@/shared/lib/auth-client";
import { MvzRanchProvider } from "@/modules/ranchos/presentation/mvz";
import { ProducerUppProvider } from "@/modules/producer/ranchos/presentation";
import { TenantWorkspaceProvider, TenantWorkspaceShell } from "@/modules/workspace";
import {
  isPermissionKey,
  isMvzViewRole,
  isProducerViewRole,
  isTenantAdminRole,
  type PermissionKey,
} from "@/shared/lib/auth";

function resolveProducerPermission(pathname: string): PermissionKey | null {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "producer") {
    return null;
  }

  if (segments.length === 1) {
    return "producer.upp.read";
  }

  if (segments[1] === "metrics" || segments[1] === "dashboard") {
    return "producer.dashboard.read";
  }

  if (segments[1] === "profile") {
    return null;
  }

  if (segments[1] === "settings" || segments[1] === "empleados") {
    return "producer.tenant.read";
  }

  if (segments[1] === "ranchos") {
    return "producer.upp.read";
  }

  if (segments[1] === "bovinos") {
    return "producer.bovinos.read";
  }

  if (segments[1] === "movilizacion") {
    return "producer.movements.read";
  }

  if (segments[1] === "exportaciones") {
    return "producer.exports.read";
  }

  if (segments[1] === "documentos") {
    return "producer.documents.read";
  }

  if (segments[1] === "projects") {
    const moduleKey = segments[3] ?? "overview";

    if (moduleKey === "animales") {
      return "producer.bovinos.read";
    }

    if (moduleKey === "movilizacion") {
      return "producer.movements.read";
    }

    if (moduleKey === "exportaciones") {
      return "producer.exports.read";
    }

    if (moduleKey === "documentos") {
      return "producer.documents.read";
    }

    return "producer.upp.read";
  }

  return null;
}

function resolveMvzPermission(pathname: string): PermissionKey | null {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "mvz") {
    return null;
  }

  if (segments.length === 1) {
    return "mvz.assignments.read";
  }

  if (segments[1] === "profile") {
    return null;
  }

  if (segments[1] === "metrics" || segments[1] === "dashboard") {
    return "mvz.dashboard.read";
  }

  if (segments[1] === "settings") {
    return "mvz.tenant.read";
  }

  if (segments[1] === "asignaciones") {
    return "mvz.assignments.read";
  }

  if (segments[1] === "pruebas") {
    return "mvz.tests.read";
  }

  if (segments[1] === "exportaciones") {
    return "mvz.exports.read";
  }

  if (segments[1] === "ranchos" && !segments[2]) {
    return "mvz.assignments.read";
  }

  if (segments[1] === "ranchos" && segments[2]) {
    const moduleKey = segments[3] ?? "overview";

    if (moduleKey === "animales") {
      return "mvz.ranch.animals.read";
    }

    if (moduleKey === "historial-clinico") {
      return "mvz.ranch.clinical.read";
    }

    if (moduleKey === "vacunacion") {
      return "mvz.ranch.vaccinations.read";
    }

    if (moduleKey === "incidencias") {
      return "mvz.ranch.incidents.read";
    }

    if (moduleKey === "reportes") {
      return "mvz.ranch.reports.read";
    }

    if (moduleKey === "documentacion") {
      return "mvz.ranch.documents.read";
    }

    if (moduleKey === "visitas") {
      return "mvz.ranch.visits.read";
    }

    return "mvz.ranch.read";
  }

  return null;
}

function resolvePermissionForPath(
  pathname: string,
  rolePath: "producer" | "mvz"
): PermissionKey | null {
  return rolePath === "producer"
    ? resolveProducerPermission(pathname)
    : resolveMvzPermission(pathname);
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

        if (isTenantAdminRole(roleResult.role)) {
          router.replace("/admin");
          return;
        }

        if (isProducerViewRole(roleResult.role) && !pathname.startsWith("/producer")) {
          router.replace("/producer");
          return;
        }

        if (isMvzViewRole(roleResult.role) && !pathname.startsWith("/mvz")) {
          router.replace("/mvz");
          return;
        }

        const rolePath = isProducerViewRole(roleResult.role) ? "producer" : "mvz";
        const requiredPermission = resolvePermissionForPath(pathname, rolePath);
        const dashboardPath = isProducerViewRole(roleResult.role) ? "/producer" : "/mvz";

        if (!requiredPermission) {
          setReady(true);
          return;
        }

        let permissions: PermissionKey[] = [];
        try {
          const authMeResponse = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
          });
          const authMeBody = await authMeResponse.json();
          if (authMeResponse.ok && authMeBody.ok && Array.isArray(authMeBody.data?.permissions)) {
            const apiPermissions = (authMeBody.data.permissions as string[]).filter(isPermissionKey);
            permissions = apiPermissions;
          }
        } catch {
          permissions = [];
        }

        if (!permissions.includes(requiredPermission)) {
          if (pathname !== dashboardPath) {
            router.replace(dashboardPath);
            return;
          }

          router.replace("/login");
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
        Validando sesion...
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
