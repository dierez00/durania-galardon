import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface DetailInfoItem {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

function getGridClass(columns: 1 | 2 | 3): string {
  if (columns === 1) return "grid-cols-1";
  if (columns === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2";
}

interface DetailInfoGridProps {
  items: DetailInfoItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}

export function DetailInfoGrid({
  items,
  columns = 2,
  className,
}: Readonly<DetailInfoGridProps>) {
  const gridClass = getGridClass(columns);

  return (
    <div className={cn("grid gap-4", gridClass, className)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={cn(
              "flex items-start gap-3 p-4 bg-muted/40 rounded-lg border border-border/50",
              item.className
            )}
          >
            {Icon && (
              <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
              <div className="text-sm font-medium text-foreground wrap-break-word">
                {item.value ?? <span className="text-muted-foreground italic">No especificado</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
