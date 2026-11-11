import type { CSSProperties } from "react";
import type { IconName } from "./icon-names";

/** A decorative icon from the design system's set. `name` is type-checked against the generated list (icon-names.ts). */
export function Icon({ name, size, swatch }: { name: IconName; size?: "sm" | "md" | "lg"; swatch?: string }) {
  return <span className={`icon icon--${name}${size ? ` icon--${size}` : ""}${swatch ? " icon--swatch" : ""}`} style={swatch ? ({ "--swatch": swatch } as CSSProperties) : undefined} aria-hidden="true" />;
}
