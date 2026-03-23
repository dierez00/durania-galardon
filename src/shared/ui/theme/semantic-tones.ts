import type { BadgeVariant } from "@/shared/ui/badge";

export const SEMANTIC_TONES = [
  "brand",
  "secondary",
  "accent",
  "neutral",
  "info",
  "success",
  "warning",
  "error",
] as const;

export type SemanticTone = (typeof SEMANTIC_TONES)[number];

export type SemanticToneSlot =
  | "badge"
  | "chip"
  | "surface"
  | "surfaceStrong"
  | "icon"
  | "text"
  | "border"
  | "ghost"
  | "dot";

const semanticToneClasses: Record<SemanticTone, Record<SemanticToneSlot, string>> = {
  brand: {
    badge: "border-transparent bg-primary text-primary-foreground",
    chip: "border-primary/15 bg-primary/10 text-primary",
    surface: "border-primary/15 bg-primary/6 text-foreground",
    surfaceStrong: "border-brand-secondary/30 bg-brand-secondary/15 text-primary",
    icon: "text-primary",
    text: "text-primary",
    border: "border-primary/20",
    ghost: "hover:bg-primary/10 hover:text-primary",
    dot: "bg-primary",
  },
  secondary: {
    badge: "border-transparent bg-brand-secondary text-brand-text",
    chip: "border-brand-secondary/30 bg-brand-secondary/18 text-primary",
    surface: "border-brand-secondary/30 bg-brand-secondary/12 text-foreground",
    surfaceStrong: "border-brand-secondary/35 bg-brand-secondary/20 text-primary",
    icon: "text-brand-secondary",
    text: "text-primary",
    border: "border-brand-secondary/30",
    ghost: "hover:bg-brand-secondary/18 hover:text-primary",
    dot: "bg-brand-secondary",
  },
  accent: {
    badge: "border-highlight-border bg-highlight-bg text-highlight",
    chip: "border-highlight-border bg-highlight-bg text-highlight",
    surface: "border-highlight-border bg-highlight-bg text-foreground",
    surfaceStrong: "border-highlight-border bg-highlight-bg text-highlight",
    icon: "text-highlight",
    text: "text-highlight",
    border: "border-highlight-border",
    ghost: "hover:bg-highlight-bg hover:text-highlight",
    dot: "bg-highlight",
  },
  neutral: {
    badge: "border-tone-neutral-border bg-tone-neutral-bg text-tone-neutral",
    chip: "border-tone-neutral-border bg-tone-neutral-bg text-tone-neutral",
    surface: "border-tone-neutral-border bg-tone-neutral-bg text-foreground",
    surfaceStrong: "border-tone-neutral-border bg-tone-neutral-bg text-tone-neutral",
    icon: "text-tone-neutral",
    text: "text-tone-neutral",
    border: "border-tone-neutral-border",
    ghost: "hover:bg-tone-neutral-bg hover:text-tone-neutral",
    dot: "bg-tone-neutral",
  },
  info: {
    badge: "border-info-border bg-info-bg text-info",
    chip: "border-info-border bg-info-bg text-info",
    surface: "border-info-border bg-info-bg text-foreground",
    surfaceStrong: "border-info-border bg-info-bg text-info",
    icon: "text-info",
    text: "text-info",
    border: "border-info-border",
    ghost: "hover:bg-info-bg hover:text-info",
    dot: "bg-info",
  },
  success: {
    badge: "border-success-border bg-success-bg text-success",
    chip: "border-success-border bg-success-bg text-success",
    surface: "border-success-border bg-success-bg text-foreground",
    surfaceStrong: "border-success-border bg-success-bg text-success",
    icon: "text-success",
    text: "text-success",
    border: "border-success-border",
    ghost: "hover:bg-success-bg hover:text-success",
    dot: "bg-success",
  },
  warning: {
    badge: "border-warning-border bg-warning-bg text-warning",
    chip: "border-warning-border bg-warning-bg text-warning",
    surface: "border-warning-border bg-warning-bg text-foreground",
    surfaceStrong: "border-warning-border bg-warning-bg text-warning",
    icon: "text-warning",
    text: "text-warning",
    border: "border-warning-border",
    ghost: "hover:bg-warning-bg hover:text-warning",
    dot: "bg-warning",
  },
  error: {
    badge: "border-error-border bg-error-bg text-error",
    chip: "border-error-border bg-error-bg text-error",
    surface: "border-error-border bg-error-bg text-foreground",
    surfaceStrong: "border-error-border bg-error-bg text-error",
    icon: "text-error",
    text: "text-error",
    border: "border-error-border",
    ghost: "hover:bg-error-bg hover:text-error",
    dot: "bg-error",
  },
};

export const toneToBadgeVariant: Record<SemanticTone, BadgeVariant> = {
  brand: "default",
  secondary: "secondary",
  accent: "accent",
  neutral: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
};

export function toneClass(tone: SemanticTone, slot: SemanticToneSlot) {
  return semanticToneClasses[tone][slot];
}
