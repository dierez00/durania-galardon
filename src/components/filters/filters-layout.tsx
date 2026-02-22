"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ─── FiltersLayout ────────────────────────────────────────────────────────────
interface FiltersLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Contenedor principal de los filtros.
 * Usa el design token bg-card / border-border del sistema.
 */
export const FiltersLayout: React.FC<FiltersLayoutProps> = ({
  children,
  className,
}) => (
  <section className={cn("mb-6", className)}>
    <div className="bg-card border border-border rounded-xl px-4 py-4 md:px-6 md:py-5 shadow-sm">
      {children}
    </div>
  </section>
);

// ─── FiltersContainer ─────────────────────────────────────────────────────────
interface FiltersContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Columna flex principal que apila las filas de filtros.
 */
export const FiltersContainer: React.FC<FiltersContainerProps> = ({
  children,
  className,
}) => (
  <div className={cn("flex flex-col gap-4", className)}>{children}</div>
);

// ─── FiltersRow ───────────────────────────────────────────────────────────────
interface FiltersRowProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Fila horizontal responsive: columna en mobile, fila en desktop.
 */
export const FiltersRow: React.FC<FiltersRowProps> = ({
  children,
  className,
}) => (
  <div className={cn("flex flex-col lg:flex-row gap-3 lg:gap-4 items-start lg:items-center", className)}>
    {children}
  </div>
);

// ─── FiltersGroup ─────────────────────────────────────────────────────────────
interface FiltersGroupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Grupo de selects/filtros pequeños en línea con wrap.
 */
export const FiltersGroup: React.FC<FiltersGroupProps> = ({
  children,
  className,
}) => (
  <div className={cn("flex flex-wrap gap-2 lg:gap-3", className)}>{children}</div>
);
