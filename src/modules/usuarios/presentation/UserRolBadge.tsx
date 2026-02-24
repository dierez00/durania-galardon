import { Badge } from "@/shared/ui/badge";

const colors: Record<string, string> = {
  Administrador: "bg-purple-100 text-purple-700",
  MVZ:           "bg-blue-100 text-blue-700",
  Ventanilla:    "bg-amber-100 text-amber-700",
  Productor:     "bg-emerald-100 text-emerald-700",
};

interface UserRolBadgeProps {
  rol: string;
}

export function UserRolBadge({ rol }: UserRolBadgeProps) {
  return (
    <Badge className={`${colors[rol] ?? ""} border-0 hover:opacity-90`}>
      {rol}
    </Badge>
  );
}
