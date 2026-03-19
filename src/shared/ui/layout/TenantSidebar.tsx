"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import type { ResolvedNavItem, WorkspaceMode } from "@/modules/workspace/domain/types";

interface TenantSidebarProps {
  brandIcon: ComponentType<{ className?: string }>;
  brandTitle: string;
  brandSubtitle: string;
  mode: WorkspaceMode;
  navigation: ResolvedNavItem[];
  contextTitle: string;
  contextSubtitle?: string | null;
}

export function TenantSidebar({
  brandIcon: BrandIcon,
  brandTitle,
  brandSubtitle,
  mode,
  navigation,
  contextTitle,
  contextSubtitle,
}: TenantSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-18" : "w-72"
      )}
    >
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <BrandIcon className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">{brandTitle}</h1>
              <p className="truncate text-xs text-sidebar-foreground/60">{brandSubtitle}</p>
            </div>
          ) : null}
        </div>
        {!collapsed ? (
          <div className="mt-4 rounded-xl border border-sidebar-border bg-sidebar-accent/35 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{contextTitle}</p>
              <Badge variant="secondary" className="border border-sidebar-border bg-transparent text-[10px] uppercase">
                {mode === "organization" ? "Organizacion" : "Proyecto"}
              </Badge>
            </div>
            {contextSubtitle ? (
              <p className="mt-1 line-clamp-2 text-xs text-sidebar-foreground/60">{contextSubtitle}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
