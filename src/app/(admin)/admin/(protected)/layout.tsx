"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppSidebar from "@app/_components/AppSidebar";
import Topbar from "@/shared/ui/layout/Topbar";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { resolveClientRole } from "@/shared/lib/auth-client";
import {
  redirectPathForRole,
  resolveAdminPermissions,
  resolvePanelHomePath,
  type PermissionKey,
} from "@/shared/lib/auth";

export default function AdminProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = async () => {
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

      if (roleResult.panelType !== "government") {
        router.replace(redirectPathForRole(roleResult.role));
        return;
      }

      const permissions: PermissionKey[] = roleResult.permissions ?? [];
      const requiredPermissions = resolveAdminPermissions(pathname);
      const panelHomePath = resolvePanelHomePath({
        panelType: "government",
        permissions,
      });

      if (
        requiredPermissions.length > 0 &&
        !requiredPermissions.some((permission) => permissions.includes(permission))
      ) {
        if (pathname !== panelHomePath) {
          router.replace(panelHomePath);
          return;
        }

        router.replace("/admin/profile");
        return;
      }

      setReady(true);
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
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
