"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { cn } from "@/shared/lib/utils";

type ThemeTone = "default" | "on-dark";

interface ThemeLogoProps {
  className?: string;
  tone?: ThemeTone;
  alt?: string;
  priority?: boolean;
}

function resolveLogoSrc(theme: string, tone: ThemeTone): string {
  if (tone === "on-dark") {
    return theme === "classic-dark"
      ? "/logos/logo8a_verde_claro.png"
      : "/logos/logo8a_blanco.png";
  }

  if (theme === "dark") {
    return "/logos/logo8a_blanco.png";
  }

  if (theme === "classic-dark") {
    return "/logos/logo8a_verde_claro.png";
  }

  return "/logos/logo8a_verde.png";
}

export function ThemeLogo({
  className,
  tone = "default",
  alt = "O.C.H.O.A",
  priority = false,
}: ThemeLogoProps) {
  const { theme = "system", resolvedTheme } = useTheme();
  const activeTheme = theme === "system" ? (resolvedTheme ?? "light") : theme;

  return (
    <Image
      src={resolveLogoSrc(activeTheme, tone)}
      alt={alt}
      width={64}
      height={64}
      className={cn("h-full w-full object-contain", className)}
      priority={priority}
    />
  );
}
