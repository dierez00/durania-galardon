"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

export interface ActionButtonConfig {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "success" | "danger" | "secondary";
  title?: string;
  /** Si true, oculta el texto en pantallas pequeñas */
  hideLabel?: boolean;
}

interface ActionButtonsProps {
  buttons: ActionButtonConfig[];
  className?: string;
}

const variantMap: Record<
  NonNullable<ActionButtonConfig["variant"]>,
  React.ComponentProps<typeof Button>["variant"]
> = {
  primary: "default",
  success: "default",
  danger: "destructive",
  secondary: "outline",
};

const extraColorMap: Record<
  NonNullable<ActionButtonConfig["variant"]>,
  string
> = {
  primary: "",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white",
  danger: "",
  secondary: "",
};

/**
 * Grupo de botones de acción configurables.
 * Se integra al final de un FiltersRow o por sí solo.
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({
  buttons,
  className,
}) => (
  <div className={cn("flex gap-2", className)}>
    {buttons.map((btn) => {
      const Icon = btn.icon;
      const extra = extraColorMap[btn.variant ?? "primary"];
      return (
        <Button
          key={`${btn.label}-${btn.variant ?? "primary"}`}
          variant={variantMap[btn.variant ?? "primary"]}
          size="sm"
          onClick={btn.onClick}
          title={btn.title ?? btn.label}
          className={cn("h-10 gap-2", extra)}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className={cn(btn.hideLabel ? "hidden" : "hidden sm:inline")}>
            {btn.label}
          </span>
        </Button>
      );
    })}
  </div>
);
