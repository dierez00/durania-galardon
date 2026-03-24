"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export const APP_THEMES = ["light", "dark", "classic-dark", "system"] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      value={{
        light: "light",
        dark: "dark",
        "classic-dark": "classic-dark",
      }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
