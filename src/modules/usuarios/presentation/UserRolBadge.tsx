import { Badge } from "@/shared/ui/badge";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";

const tones: Record<string, SemanticTone> = {
  Administrador: "accent",
  MVZ: "info",
  Ventanilla: "warning",
  Productor: "brand",
};

interface UserRolBadgeProps {
  rol: string;
}

export function UserRolBadge({ rol }: UserRolBadgeProps) {
  return (
    <Badge variant={toneToBadgeVariant[tones[rol] ?? "neutral"]}>{rol}</Badge>
  );
}
