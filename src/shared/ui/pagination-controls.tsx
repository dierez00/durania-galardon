"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Llamado cuando el usuario salta a una página específica via el input. */
  onPageChange: (page: number) => void;
  className?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Barra de paginación anterior/siguiente con indicador de página editable.
 * El input central permite saltar directamente a cualquier página con Enter o al perder el foco.
 *
 * @example
 * <PaginationControls
 *   page={page}
 *   totalPages={totalPages}
 *   canPrev={canPrev}
 *   canNext={canNext}
 *   onPrev={() => setPage((p) => p - 1)}
 *   onNext={() => setPage((p) => p + 1)}
 *   onPageChange={setPage}
 * />
 */
export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  totalPages,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onPageChange,
  className,
}) => {
  const [inputValue, setInputValue] = useState(String(page));

  // Sincroniza el input cuando el padre cambia la página (prev/next/externo)
  useEffect(() => {
    setInputValue(String(page));
  }, [page]);

  const commit = () => {
    const parsed = Number.parseInt(inputValue, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= totalPages && parsed !== page) {
      onPageChange(parsed);
    } else {
      // Valor inválido: revierte al número de página actual
      setInputValue(String(page));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      commit();
    } else if (e.key === "Escape") {
      setInputValue(String(page));
      e.currentTarget.blur();
    }
  };

  return (
    <div className={`flex items-center justify-between pt-2 ${className ?? ""}`}>
      <p className="text-sm text-muted-foreground">
        de {totalPages} páginas
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!canPrev} onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <Input
          type="number"
          min={1}
          max={totalPages}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="h-8 w-14 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label="Número de página"
        />

        <Button variant="outline" size="sm" disabled={!canNext} onClick={onNext}>
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
