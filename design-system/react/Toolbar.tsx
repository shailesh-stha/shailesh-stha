import { useEffect, useRef, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";

const ITEM = 'button, select, a[href], input, [role="button"], [tabindex]';

export interface ToolbarProps {
  /** Accessible name, e.g. "Text formatting". */
  label: string;
  orientation?: "horizontal" | "vertical";
  /** One line that scrolls sideways instead of wrapping. */
  scroll?: boolean;
  /** Full-width bar: square, bottom border only, padding at both ends. For the row of tools under a topbar. */
  bar?: boolean;
  children: ReactNode;
}

/** Roving tabindex for a role="toolbar" element: one tab stop, Left/Right (Up/Down when vertical; mirrored in RTL) and Home/End move between enabled controls. Same model as toolbar.js. Spread the result on the element. */
export function useRovingToolbar(vertical = false) {
  const root = useRef<HTMLDivElement>(null);

  const items = () => Array.from(root.current?.querySelectorAll<HTMLElement>(ITEM) ?? []).filter(el =>
    !(el as HTMLButtonElement).disabled && !el.hidden && el.getAttribute("aria-disabled") !== "true" && !el.matches(".toolbar__separator") && el.getClientRects().length > 0);
  const setActive = (active: HTMLElement | undefined) => root.current?.querySelectorAll<HTMLElement>(ITEM).forEach(el => { if (!el.matches(".toolbar__separator")) el.setAttribute("tabindex", el === active ? "0" : "-1"); });

  // Re-applied after every render so controls added later join the roving order.
  useEffect(() => {
    const list = items();
    setActive(list.find(el => el.getAttribute("tabindex") === "0") ?? list[0]);
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const list = items();
    const target = document.activeElement as HTMLElement | null;
    const current = target ? list.indexOf(target) : -1;
    if (!target || current < 0) return;
    if (target.tagName === "INPUT" && !/^(button|checkbox|radio|submit|reset|range)$/.test((target as HTMLInputElement).type)) return;
    const rtl = root.current ? getComputedStyle(root.current).direction === "rtl" : false;
    let key = event.key;
    if (!vertical && rtl && (key === "ArrowLeft" || key === "ArrowRight")) key = key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
    if (target.tagName === "SELECT" && !vertical && (key === "ArrowUp" || key === "ArrowDown")) return;
    let next = -1;
    if (key === (vertical ? "ArrowDown" : "ArrowRight")) next = (current + 1) % list.length;
    else if (key === (vertical ? "ArrowUp" : "ArrowLeft")) next = (current - 1 + list.length) % list.length;
    else if (key === "Home") next = 0;
    else if (key === "End") next = list.length - 1;
    else return;
    event.preventDefault();
    setActive(list[next]);
    list[next].focus();
  };

  const onFocus = (event: FocusEvent<HTMLDivElement>) => { const t = event.target as HTMLElement; if (items().includes(t)) setActive(t); };

  return { ref: root, onKeyDown, onFocus };
}

/** A toolbar with a roving tabindex: one tab stop, Left/Right (Up/Down when vertical; mirrored in RTL) and Home/End move between enabled controls. Same model as toolbar.js. */
export function Toolbar({ label, orientation = "horizontal", scroll = false, bar = false, children }: ToolbarProps) {
  const vertical = orientation === "vertical";
  const roving = useRovingToolbar(vertical);
  return <div
    {...roving}
    className={`toolbar${scroll ? " toolbar--scroll" : ""}${bar ? " toolbar--bar" : ""}`}
    role="toolbar"
    aria-label={label}
    aria-orientation={vertical ? "vertical" : undefined}
  >{children}</div>;
}

/** A labelled group of related controls inside a Toolbar. */
export function ToolbarGroup({ label, children }: { label: string; children: ReactNode }) {
  return <div className="toolbar__group" role="group" aria-label={label}>{children}</div>;
}

export function ToolbarSeparator({ vertical = true }: { vertical?: boolean }) {
  return <span className="toolbar__separator" role="separator" aria-orientation={vertical ? "vertical" : "horizontal"} />;
}
