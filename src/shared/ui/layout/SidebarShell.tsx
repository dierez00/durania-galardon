"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface SidebarNavigationItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface SidebarShellProps {
  navigation: SidebarNavigationItem[];
  brandIcon: ComponentType<{ className?: string }>;
  brandTitle: string;
  brandSubtitle?: string;
}

export function SidebarShell({
  navigation,
  brandIcon: BrandIcon,
  brandTitle,
  brandSubtitle,
}: SidebarShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-17" : "w-65"
      )}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-4 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
          <BrandIcon className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed ? (
          <div className="ml-3 overflow-hidden">
            <h1 className="tracking-tight text-base font-bold text-sidebar-foreground">{brandTitle}</h1>
            {brandSubtitle ? (
              <p className="text-[10px] leading-none text-sidebar-foreground/50">{brandSubtitle}</p>
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
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span>{item.name}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
