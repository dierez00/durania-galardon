"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppSidebar from "@app/_components/AppSidebar";
import Topbar from "@/shared/ui/layout/Topbar";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { resolveClientRole } from "@/shared/lib/auth-client";
import { redirectPathForRole } from "@/shared/lib/auth";

export default function AdminProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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

      setReady(true);
    };

    void run();
  }, [router]);

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
