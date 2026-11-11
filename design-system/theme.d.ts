export {};
declare global {
  type DesignThemeMode = "dark" | "light" | "system";
  type DesignDensity = "comfortable" | "compact";
  interface DesignThemeEventDetail { mode: DesignThemeMode; theme: "dark" | "light" }
  interface DocumentEventMap { "design:theme": CustomEvent<DesignThemeEventDetail> }
  interface Window {
    designTheme: {
      /** The resolved theme currently on <html> ("system" mode resolves to dark or light). */
      get(): "dark" | "light";
      /** Same as setMode; "system" is accepted too. */
      set(theme: DesignThemeMode): void;
      /** The chosen mode: "system" follows the operating system live. */
      getMode(): DesignThemeMode;
      setMode(mode: DesignThemeMode): void;
      setAccent(accent: "" | "magenta" | "blue" | "green" | "orange"): void;
      /** Custom accent from one "#rrggbb". Derives accent, accent-text, accent-solid and on-accent for the current theme and returns whether a value moved noticeably from the input; null clears it; an invalid hex returns null and changes nothing. */
      setAccentColor(hex: string | null): { adjusted: boolean } | null;
      getAccentColor(): string | null;
      /** The pure derivation for one theme; null for an invalid hex. */
      deriveAccent(hex: string, theme: "dark" | "light"): { accent: string; accentText: string; accentSolid: string; onAccent: string; adjusted: boolean } | null;
      /** Sets the derived accent tokens on one element (a preview, a swatch) for the given theme; an empty or invalid hex clears them. Returns the tokens or null. */
      setAccentProps(element: HTMLElement | null, hex: string | null | undefined, theme: "dark" | "light"): { accent: string; accentText: string; accentSolid: string; onAccent: string; adjusted: boolean } | null;
      /** True for a "#rrggbb" string (surrounding spaces allowed). */
      isHexColor(value: unknown): boolean;
      getDensity(): DesignDensity;
      setDensity(density: DesignDensity): void;
    };
  }
}
