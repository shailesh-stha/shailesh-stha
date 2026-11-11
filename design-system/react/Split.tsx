import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

export interface SplitProps {
  /** Content of the first pane (the one the handle resizes). */
  first: ReactNode;
  second: ReactNode;
  /** Accessible name of the handle, e.g. "Resize sidebar". */
  label: string;
  /** Stack the panes (top over bottom) instead of side by side. */
  vertical?: boolean;
  /** Take the height of a bounded parent (a flex or grid cell) instead of the default minimum or 24rem. */
  fill?: boolean;
  /** Starting size of the first pane in percent (default 50). */
  defaultSize?: number;
  /** Limits in percent (defaults 10 and 90). */
  min?: number;
  max?: number;
  /** Keyboard steps in percent (defaults 2 and 10 with Shift). */
  step?: number;
  bigStep?: number;
  /** Enter on the handle collapses the first pane and restores it. */
  collapsible?: boolean;
  onResize?: (size: number, collapsed: boolean) => void;
}

/** Two resizable panes. Same markup, ARIA (window splitter) and keyboard model as split.js: arrows, Shift+arrows, Home/End, Enter to collapse, double-click resets, pointer drag with touch. */
export function Split({ first, second, label, vertical = false, fill = false, defaultSize = 50, min = 10, max = 90, step = 2, bigStep = 10, collapsible = false, onResize }: SplitProps) {
  const initial = Math.min(max, Math.max(min, defaultSize));
  const [size, setSize] = useState(initial);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const remembered = useRef(initial);
  const root = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const paneId = useRef(`split-pane-${Math.random().toString(36).slice(2, 8)}`).current;
  const shown = collapsed ? 0 : size;

  const apply = (value: number, isCollapsed: boolean) => { setSize(value); setCollapsed(isCollapsed); onResize?.(isCollapsed ? 0 : value, isCollapsed); };
  const set = (value: number) => apply(Math.min(max, Math.max(min, value)), false);
  const toggle = () => {
    if (!collapsible) return;
    if (collapsed) apply(remembered.current, false);
    else { remembered.current = size; apply(size, true); }
  };
  const rtl = () => !!root.current && getComputedStyle(root.current).direction === "rtl";

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = root.current!.getBoundingClientRect();
    const thickness = vertical ? handle.current!.offsetHeight : handle.current!.offsetWidth;
    const total = vertical ? rect.height : rect.width;
    const at = vertical ? event.clientY - rect.top : (rtl() ? rect.right - event.clientX : event.clientX - rect.left);
    return total > 0 ? ((at - thickness / 2) / total) * 100 : size;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const amount = event.shiftKey ? bigStep : step;
    const decrease = vertical ? "ArrowUp" : rtl() ? "ArrowRight" : "ArrowLeft";
    const increase = vertical ? "ArrowDown" : rtl() ? "ArrowLeft" : "ArrowRight";
    if (event.key === decrease) set(collapsed ? min : size - amount);
    else if (event.key === increase) set(collapsed ? min : size + amount);
    else if (event.key === "Home") set(min);
    else if (event.key === "End") set(max);
    else if (event.key === "Enter") toggle();
    else return;
    event.preventDefault();
  };

  return <div ref={root} className={`split${vertical ? " split--vertical" : ""}${fill ? " split--fill" : ""}`} data-dragging={dragging ? "" : undefined} style={{ "--split-size": `${shown}%` } as CSSProperties}>
    <div className="split__pane" id={paneId} inert={collapsed ? true : undefined}>{first}</div>
    <div
      ref={handle}
      className="split__handle"
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-controls={paneId}
      aria-orientation={vertical ? "horizontal" : "vertical"}
      aria-valuenow={Math.round(shown)}
      aria-valuemin={collapsible ? 0 : min}
      aria-valuemax={max}
      data-dragging={dragging ? "" : undefined}
      onPointerDown={event => { if (event.button !== 0 && event.pointerType === "mouse") return; event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); event.currentTarget.focus({ preventScroll: true }); event.preventDefault(); }}
      onPointerMove={event => { if (dragging) set(fromPointer(event)); }}
      onPointerUp={event => { setDragging(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => setDragging(false)}
      onDoubleClick={() => set(initial)}
      onKeyDown={onKeyDown}
    />
    <div className="split__pane">{second}</div>
  </div>;
}
