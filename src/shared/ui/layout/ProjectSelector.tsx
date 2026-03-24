"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import type { WorkspaceProject } from "@/modules/workspace/domain/types";

interface ProjectSelectorProps {
  projects: WorkspaceProject[];
  currentProjectId: string | null;
  currentLabel?: string;
  onProjectChange: (projectId: string) => void;
}

export function ProjectSelector({
  projects,
  currentProjectId,
  currentLabel,
  onProjectChange,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const currentProject = useMemo(
    () => projects.find((project) => project.id === currentProjectId) ?? null,
    [currentProjectId, projects]
  );

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return projects;
    }

    return projects.filter((project) => {
      const haystack = [
        project.name,
        project.code,
        project.producerName,
        project.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [projects, search]);

  if (projects.length === 0) {
    return <span className="text-sm font-medium text-muted-foreground">{currentLabel ?? "Sin ranchos"}</span>;
  }

  const triggerLabel = currentProject?.name ?? currentLabel ?? "Seleccionar rancho";

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
            placeholder="Buscar rancho..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No se encontraron ranchos.</CommandEmpty>
            <CommandGroup>
              {filteredProjects.map((project) => {
                const meta = [project.code, project.producerName, project.status]
                  .filter(Boolean)
                  .join(" - ");

                return (
                  <CommandItem
                    key={project.id}
                    value={[project.name, project.code, project.producerName, project.status].filter(Boolean).join(" ")}
                    onSelect={() => {
                      onProjectChange(project.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="gap-3 py-2.5"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{project.name}</p>
                        {meta ? (
                          <p className="truncate text-xs text-muted-foreground">{meta}</p>
                        ) : null}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4 shrink-0",
                        currentProjectId === project.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
