import { cn } from "@/shared/lib/utils";

interface DetailWorkspaceProps {
  summary?: React.ReactNode;
  tabs?: React.ReactNode;
  main: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  sidebarClassName?: string;
}

export function DetailWorkspace({
  summary,
  tabs,
  main,
  sidebar,
  className,
  contentClassName,
  sidebarClassName,
}: Readonly<DetailWorkspaceProps>) {
  return (
    <div className={cn("space-y-6", className)}>
      {summary}
      {tabs}
      <div
        className={cn(
          "grid gap-6",
          sidebar ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-1",
          contentClassName
        )}
      >
        <div className="min-w-0">{main}</div>
        {sidebar ? <aside className={cn("space-y-4", sidebarClassName)}>{sidebar}</aside> : null}
      </div>
    </div>
  );
}
