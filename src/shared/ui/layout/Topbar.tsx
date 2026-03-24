"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";

interface UserInfo {
  displayName: string;
  email: string;
  roleLabel: string;
}

export default function Topbar() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo>({
    displayName: "",
    email: "",
    roleLabel: "",
  });

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const sessionEmail = data.session.user.email ?? "";

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const body = await res.json();
        if (res.ok && body.ok && body.data) {
          setUserInfo({
            displayName: body.data.user?.displayName ?? sessionEmail,
            email: sessionEmail,
            roleLabel: body.data.user?.roleName ?? "",
          });
          return;
        }
      } catch {
        // fallback
      }

      setUserInfo({ displayName: sessionEmail, email: sessionEmail, roleLabel: "" });
    };

    void run();
  }, []);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Panel Administrativo
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium leading-none">
                  {userInfo.displayName || "..."}
                </p>
                {userInfo.roleLabel ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{userInfo.roleLabel}</p>
                ) : null}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{userInfo.displayName}</p>
              <p className="text-xs text-muted-foreground">{userInfo.email}</p>
              {userInfo.roleLabel ? (
                <Badge variant="secondary" className="mt-1.5 text-[10px]">
                  {userInfo.roleLabel}
                </Badge>
              ) : null}
            </div>
            <DropdownMenuSeparator />
            <button
              type="button"
              className="w-full flex items-center px-3 py-2 text-sm text-destructive hover:bg-accent rounded-sm"
              onClick={async () => {
                const supabase = getSupabaseBrowserClient();
                await supabase.auth.signOut();
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesion
            </button>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
