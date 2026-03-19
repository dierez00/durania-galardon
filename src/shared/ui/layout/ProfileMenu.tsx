"use client";

import { useRouter } from "next/navigation";
import { Check, LogOut, Palette, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { APP_THEMES, type AppTheme } from "@/shared/providers/ThemeProvider";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface ProfileMenuProps {
  displayName: string;
  email: string;
  roleLabel: string;
  settingsHref: string;
}

const THEME_LABELS: Record<AppTheme, string> = {
  light: "Claro",
  dark: "Oscuro",
  "classic-dark": "Clasico oscuro",
  system: "Sistema",
};

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "DU";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProfileMenu({
  displayName,
  email,
  roleLabel,
  settingsHref,
}: ProfileMenuProps) {
  const router = useRouter();
  const { theme = "system", setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(displayName || email)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel || email}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <div className="text-sm font-semibold">{displayName}</div>
          <div className="text-xs font-normal text-muted-foreground">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(settingsHref)}>
          <Settings className="h-4 w-4" />
          Configuracion
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="h-4 w-4" />
            Tema
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuRadioGroup
              value={APP_THEMES.includes(theme as AppTheme) ? theme : "system"}
              onValueChange={(value) => setTheme(value)}
            >
              {APP_THEMES.map((themeKey) => (
                <DropdownMenuRadioItem key={themeKey} value={themeKey}>
                  <span className="flex items-center gap-2">
                    {theme === themeKey ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
                    {THEME_LABELS[themeKey]}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            const supabase = getSupabaseBrowserClient();
            await supabase.auth.signOut();
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          }}
          variant="destructive"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
