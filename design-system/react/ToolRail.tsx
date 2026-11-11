import type { ReactNode } from "react";
import type { IconName } from "./icon-names";
import { Icon } from "./Icon";
import { Toolbar, ToolbarSeparator } from "./Toolbar";

export interface ToolRailProps {
  /** Accessible name of the rail, e.g. "Draw tools". */
  label: string;
  children: ReactNode;
}

/** A narrow rail of square tool buttons beside a canvas. One tab stop, arrow keys move between tools (it is a vertical toolbar inside). */
export function ToolRail({ label, children }: ToolRailProps) {
  return <aside className="tool-rail" aria-label={label}><Toolbar label={label} orientation="vertical">{children}</Toolbar></aside>;
}

export interface ToolRailGroupProps {
  label: string;
  /** Columns of square cells (default 2). */
  cols?: 2 | 3;
  children: ReactNode;
}

/** A labelled group of tools. Put a <ToolRailSeparator /> between groups. */
export function ToolRailGroup({ label, cols = 2, children }: ToolRailGroupProps) {
  return <div className={`tool-rail__grid${cols === 3 ? " tool-rail__grid--3" : ""}`} role="group" aria-label={label}>{children}</div>;
}

export function ToolRailSeparator() { return <ToolbarSeparator />; }

export interface ToolRailItemProps {
  /** Accessible name; also the hover title unless `title` is given. */
  label: string;
  title?: string;
  /** Picture: a design icon, or a glyph (a small drawn square) or any element such as a tile. */
  icon?: IconName;
  glyph?: "outline" | "rect" | "fill";
  children?: ReactNode;
  /** Key hint shown in the corner. */
  keyHint?: string;
  /** Small badge in the corner (a cost or a count). */
  badge?: string | number | null;
  pressed?: boolean;
  /** "primary" is the main action (filled accent), "default" a bordered button, "ghost" (default) a plain tool. */
  variant?: "primary" | "default" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
}

/** One square tool button. */
export function ToolRailItem({ label, title, icon, glyph, children, keyHint, badge, pressed, variant = "ghost", disabled, onClick }: ToolRailItemProps) {
  return (
    <button type="button" className={`btn${variant === "default" ? "" : ` btn--${variant}`} tool-rail__item`} aria-label={label} title={title ?? label}
      aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      {icon && <Icon name={icon} />}
      {glyph && <span className={`tool-rail__glyph${glyph === "outline" ? "" : ` tool-rail__glyph--${glyph}`}`} aria-hidden="true" />}
      {children}
      {keyHint && <kbd className="tool-rail__key">{keyHint}</kbd>}
      {badge !== null && badge !== undefined && <span className="badge badge--sm tool-rail__key">{badge}</span>}
    </button>
  );
}
