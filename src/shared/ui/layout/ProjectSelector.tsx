"use client";

import { FolderSearch } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { WorkspaceProject } from "@/modules/workspace/domain/types";

interface ProjectSelectorProps {
  projects: WorkspaceProject[];
  currentProjectId: string | null;
  onProjectChange: (projectId: string) => void;
}

export function ProjectSelector({
  projects,
  currentProjectId,
  onProjectChange,
}: ProjectSelectorProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="min-w-[220px] max-w-[320px]">
      <Select value={currentProjectId ?? undefined} onValueChange={onProjectChange}>
        <SelectTrigger size="sm" className="w-full bg-background">
          <FolderSearch className="h-4 w-4" />
          <SelectValue placeholder="Seleccionar proyecto" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{project.name}</span>
                {project.code ? (
                  <span className="text-xs text-muted-foreground">{project.code}</span>
                ) : null}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
