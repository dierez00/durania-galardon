"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { resolveClientRole } from "@/shared/lib/auth-client";
import { cn } from "@/shared/lib/utils";

const navigation = [
  { href: "/admin/panel", label: "Panel" },
  { href: "/admin/users", label: "Usuarios" },
];

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

      if (roleResult.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setReady(true);
    };

    void run();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Validando sesion...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white">
              ADMIN
            </span>
            <span className="text-sm font-medium">Durania</span>
          </div>

          <nav className="flex items-center gap-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const supabase = getSupabaseBrowserClient();
              await supabase.auth.signOut();
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }}
          >
            Cerrar sesion
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
