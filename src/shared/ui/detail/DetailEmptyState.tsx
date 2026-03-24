import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface DetailEmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
  className?: string;
}

export function DetailEmptyState({
  icon: Icon,
  message,
  description,
  className,
}: Readonly<DetailEmptyStateProps>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      <Icon className="w-14 h-14 text-muted-foreground/40 mb-4" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {description && (
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">{description}</p>
      )}
    </div>
  );
}
