"use client";

import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export interface TableRowActionItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
  separatorBefore?: boolean;
}

interface TableRowActionsProps {
  label?: string;
  items: TableRowActionItem[];
  align?: "start" | "center" | "end";
}

export function TableRowActions({
  label = "Acciones",
  items,
  align = "end",
}: Readonly<TableRowActionsProps>) {
  const visibleItems = items.filter((item) => !item.disabled);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {visibleItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.key}>
              {item.separatorBefore ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                variant={item.variant}
                onClick={(event) => {
                  event.stopPropagation();
                  item.onSelect();
                }}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {item.label}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
