"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface Tab {
  key: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface DetailTabBarProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function DetailTabBar({
  tabs,
  active,
  onChange,
  className,
}: Readonly<DetailTabBarProps>) {
  return (
    <div
      className={cn(
        "border-b border-border",
        className
      )}
    >
      <div className="flex gap-0 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                "flex items-center gap-2 pb-3 px-4 border-b-2 text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {Icon && <Icon className="w-4 h-4 shrink-0" />}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-medium",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
