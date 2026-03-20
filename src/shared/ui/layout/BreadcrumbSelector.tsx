"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import type { WorkspaceSelectorOption } from "@/modules/workspace/domain/types";

interface BreadcrumbSelectorProps {
  options: WorkspaceSelectorOption[];
  currentId: string | null;
  currentLabel?: string;
  onChange: (id: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function BreadcrumbSelector({
  options,
  currentId,
  currentLabel,
  onChange,
  searchPlaceholder = "Buscar...",
  emptyMessage = "No se encontraron resultados.",
}: BreadcrumbSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const currentOption = useMemo(
    () => options.find((option) => option.id === currentId) ?? null,
    [currentId, options]
  );

  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) => {
      const haystack = [option.label, option.meta].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [options, search]);

  if (options.length === 0) {
    return <span className="text-sm font-medium text-muted-foreground">{currentLabel ?? "Sin opciones"}</span>;
  }

  const triggerLabel = currentOption?.label ?? currentLabel ?? "Seleccionar";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex max-w-[280px] items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.id}
                  value={[option.label, option.meta].filter(Boolean).join(" ")}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="gap-3 py-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{option.label}</p>
                      {option.meta ? (
                        <p className="truncate text-xs text-muted-foreground">{option.meta}</p>
                      ) : null}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0",
                      currentId === option.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
