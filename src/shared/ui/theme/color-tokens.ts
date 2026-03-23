export const APP_THEME_KEYS = ["light", "dark", "classic-dark"] as const;

export type AppResolvedTheme = (typeof APP_THEME_KEYS)[number];

export const APP_COLOR_TOKEN_VARS = {
  brandPrimary: "--brand-primary",
  brandSecondary: "--brand-secondary",
  brandTertiary: "--brand-tertiary",
  brandAccent: "--brand-accent",
  brandSoft: "--brand-soft",
  brandBackground: "--brand-background",
  brandSurface: "--brand-surface",
  brandText: "--brand-text",
  neutral: "--neutral",
  neutralBackground: "--neutral-bg",
  highlight: "--highlight",
  highlightBackground: "--highlight-bg",
  info: "--info",
  infoBackground: "--info-bg",
  success: "--success",
  successBackground: "--success-bg",
  warning: "--warning",
  warningBackground: "--warning-bg",
  error: "--error",
  errorBackground: "--error-bg",
} as const;

export type AppColorToken = keyof typeof APP_COLOR_TOKEN_VARS;

export const APP_COLOR_TOKEN_FALLBACKS: Record<
  AppResolvedTheme,
  Record<AppColorToken, string>
> = {
  light: {
    brandPrimary: "#065758",
    brandSecondary: "#82c3c4",
    brandTertiary: "#bdc6a4",
    brandAccent: "#c4b760",
    brandSoft: "#a9d4d6",
    brandBackground: "#f9fafc",
    brandSurface: "#fefeff",
    brandText: "#1a222f",
    neutral: "#59606e",
    neutralBackground: "#eff5f5",
    highlight: "#9c8b2a",
    highlightBackground: "#f1eccf",
    info: "#3f7fee",
    infoBackground: "#daeaff",
    success: "#4ec4a0",
    successBackground: "#f0fdf4",
    warning: "#e8741b",
    warningBackground: "#fdedd5",
    error: "#d14344",
    errorBackground: "#fee2e1",
  },
  dark: {
    brandPrimary: "#82c3c4",
    brandSecondary: "#5ea5a6",
    brandTertiary: "#5f6a51",
    brandAccent: "#d5c97a",
    brandSoft: "#31595b",
    brandBackground: "#0e181a",
    brandSurface: "#162428",
    brandText: "#eef5f6",
    neutral: "#c0ccd0",
    neutralBackground: "#1d2c30",
    highlight: "#e8da91",
    highlightBackground: "#2c291c",
    info: "#8ab6ff",
    infoBackground: "#1c2943",
    success: "#7ad3b5",
    successBackground: "#143129",
    warning: "#ffb06a",
    warningBackground: "#392717",
    error: "#ff9193",
    errorBackground: "#3a1d1f",
  },
  "classic-dark": {
    brandPrimary: "#74b4b5",
    brandSecondary: "#4e898c",
    brandTertiary: "#81886a",
    brandAccent: "#ccb86a",
    brandSoft: "#2d4e50",
    brandBackground: "#10151a",
    brandSurface: "#171d24",
    brandText: "#e7edf1",
    neutral: "#bcc8cd",
    neutralBackground: "#1d272d",
    highlight: "#e0cf87",
    highlightBackground: "#2b271d",
    info: "#84abf6",
    infoBackground: "#1b273d",
    success: "#74c5aa",
    successBackground: "#17302b",
    warning: "#f0a763",
    warningBackground: "#392a18",
    error: "#ec8b8e",
    errorBackground: "#381f22",
  },
};

export function colorTokenVar(token: AppColorToken) {
  return `var(${APP_COLOR_TOKEN_VARS[token]})`;
}

export function readColorToken(
  token: AppColorToken,
  options?: {
    fallbackTheme?: AppResolvedTheme;
    root?: HTMLElement;
  }
) {
  const fallbackTheme = options?.fallbackTheme ?? "light";
  const fallback = APP_COLOR_TOKEN_FALLBACKS[fallbackTheme][token];

  if (typeof window === "undefined") {
    return fallback;
  }

  const root = options?.root ?? document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(APP_COLOR_TOKEN_VARS[token]).trim();
  return value || fallback;
}
