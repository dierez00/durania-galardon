"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/shared/ui/layout/Sidebar";
import Topbar from "@/shared/ui/layout/Topbar";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { resolveClientRole } from "@/shared/lib/auth-client";
import { MvzRanchProvider, ProducerUppProvider } from "@/shared/hooks";
import {
  ROLE_DEFAULT_PERMISSIONS,
  isPermissionKey,
  isMvzViewRole,
  isProducerViewRole,
  isTenantAdminRole,
  type PermissionKey,
} from "@/shared/lib/auth";

const producerRoutePermissions: Array<{ prefix: string; permission: PermissionKey }> = [
  { prefix: "/producer/dashboard", permission: "producer.dashboard.read" },
  { prefix: "/producer/ranchos", permission: "producer.upp.read" },
  { prefix: "/producer/bovinos", permission: "producer.bovinos.read" },
  { prefix: "/producer/movilizacion", permission: "producer.movements.read" },
  { prefix: "/producer/exportaciones", permission: "producer.exports.read" },
  { prefix: "/producer/documentos", permission: "producer.documents.read" },
  { prefix: "/producer/empleados", permission: "producer.employees.read" },
];

const mvzRoutePermissions: Array<{ prefix: string; permission: PermissionKey }> = [
  { prefix: "/mvz/dashboard", permission: "mvz.dashboard.read" },
  { prefix: "/mvz/ranchos", permission: "mvz.ranch.read" },
  { prefix: "/mvz/asignaciones", permission: "mvz.assignments.read" },
  { prefix: "/mvz/pruebas", permission: "mvz.tests.read" },
  { prefix: "/mvz/exportaciones", permission: "mvz.exports.read" },
];

function resolvePermissionForPath(pathname: string, rolePath: "producer" | "mvz"): PermissionKey | null {
  const source = rolePath === "producer" ? producerRoutePermissions : mvzRoutePermissions;
  const match = source.find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`));
  return match?.permission ?? null;
}

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

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
          router.replace("/producer/dashboard");
          return;
        }

        if (isMvzViewRole(roleResult.role) && !pathname.startsWith("/mvz")) {
          router.replace("/mvz/dashboard");
          return;
        }

        const permissionsFallback = ROLE_DEFAULT_PERMISSIONS[roleResult.role] ?? [];
        const rolePath = isProducerViewRole(roleResult.role) ? "producer" : "mvz";
        const requiredPermission = resolvePermissionForPath(pathname, rolePath);
        const dashboardPath = isProducerViewRole(roleResult.role) ? "/producer/dashboard" : "/mvz/dashboard";

        if (!requiredPermission) {
          if (pathname !== dashboardPath) {
            router.replace(dashboardPath);
            return;
          }

          setReady(true);
          return;
        }

        let permissions = permissionsFallback;
        try {
          const authMeResponse = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
          });
          const authMeBody = await authMeResponse.json();
          if (authMeResponse.ok && authMeBody.ok && Array.isArray(authMeBody.data?.permissions)) {
            const apiPermissions = (authMeBody.data.permissions as string[]).filter(isPermissionKey);
            if (apiPermissions.length > 0) {
              permissions = apiPermissions;
            }
          }
        } catch {
          permissions = permissionsFallback;
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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 overflow-auto">
          {pathname.startsWith("/producer") ? (
            <ProducerUppProvider>{children}</ProducerUppProvider>
          ) : (
            <MvzRanchProvider>{children}</MvzRanchProvider>
          )}
        </main>
      </div>
    </div>
  );
}
