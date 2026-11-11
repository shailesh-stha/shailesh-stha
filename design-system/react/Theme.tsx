/// <reference path="../theme.d.ts" />
import { useCallback, useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Menu } from "./Menu";

export type Theme = "dark" | "light";
export type ThemeMode = "dark" | "light" | "system";
export type Density = "comfortable" | "compact";

/**
 * Reads and switches the theme through theme.js (import "design-system/theme.js" once at startup). Dark is the default.
 * `theme` is the resolved theme on <html>; `mode` is what the user chose ("system" follows the operating system and keeps `theme` up to date).
 * `toggle()` switches between dark and light explicitly, as before; use `setMode("system")` to hand control back to the system.
 */
export function useTheme(): { theme: Theme; next: Theme; toggle: () => void; mode: ThemeMode; setMode: (mode: ThemeMode) => void } {
  const [state, setState] = useState<{ theme: Theme; mode: ThemeMode }>(() => ({ theme: window.designTheme.get(), mode: window.designTheme.getMode() }));
  useEffect(() => {
    const sync = () => setState({ theme: window.designTheme.get(), mode: window.designTheme.getMode() });
    document.addEventListener("design:theme", sync);
    sync();
    return () => document.removeEventListener("design:theme", sync);
  }, []);
  const next: Theme = state.theme === "dark" ? "light" : "dark";
  const setMode = useCallback((mode: ThemeMode) => { window.designTheme.setMode(mode); setState({ theme: window.designTheme.get(), mode }); }, []);
  const toggle = useCallback(() => setMode(next), [setMode, next]);
  return { theme: state.theme, next, toggle, mode: state.mode, setMode };
}

/** Reads and switches the density (comfortable or compact) through theme.js. */
export function useDensity(): { density: Density; setDensity: (density: Density) => void } {
  const [density, set] = useState<Density>(() => window.designTheme.getDensity());
  const setDensity = useCallback((next: Density) => { window.designTheme.setDensity(next); set(next); }, []);
  return { density, setDensity };
}

const THEME_OPTIONS = [
  { mode: "light", label: "Light", icon: "sun" },
  { mode: "dark", label: "Dark", icon: "moon" },
  { mode: "system", label: "System", icon: "monitor" }
] as const;

/** Icon button that opens a menu for Light, Dark or the operating-system theme. */
export function ThemeToggle(_props: {
  /** @deprecated Kept for compatibility; the control now always offers all three modes. */
  system?: boolean;
  /** @deprecated The theme menu has no hover tooltip. */
  tipSide?: "top" | "bottom" | "start" | "end";
  /** @deprecated The theme menu has no hover tooltip. */
  tipShift?: "start" | "end";
}) {
  const { theme, mode, setMode } = useTheme();
  const icon = mode === "system" ? "monitor" : theme === "dark" ? "moon" : "sun";
  return <Menu
    label="Choose theme"
    trigger={<Icon name={icon} />}
    items={THEME_OPTIONS.map(option => ({
      label: option.label,
      icon: option.icon,
      onSelect: () => setMode(option.mode),
      checked: mode === option.mode,
      radio: true
    }))}
  />;
}
