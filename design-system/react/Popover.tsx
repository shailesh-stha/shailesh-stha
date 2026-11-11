import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface PopoverProps {
  /** Trigger content (text and/or an icon). The trigger is a button. */
  trigger: ReactNode;
  /** Accessible name of the panel (role=group). */
  label: string;
  /** Accessible name of the trigger when it has no text (icon only). Leave out when the trigger has visible text. */
  triggerLabel?: string;
  /** The panel content: any markup, including form fields. It is not a menu (use Menu for actions). */
  children: ReactNode;
  /** Align the panel to the end of the trigger (default) or its start. */
  align?: "end" | "start";
  /** Extra classes for the trigger button, e.g. "btn btn--primary". Default "btn". */
  triggerClassName?: string;
  /** Called after the panel opens or closes. */
  onOpenChange?: (open: boolean) => void;
}

const supportsAnchor = () => typeof CSS !== "undefined" && CSS.supports?.("position-area", "block-end");

/** A non-modal panel opened from a button, built on the Popover API: top layer, Escape and click-outside close it, focus returns to the button.
 *  Where CSS anchor positioning is missing a small fallback places it below the button and flips it at the viewport edges. */
export function Popover({ trigger, label, triggerLabel, children, align = "end", triggerClassName = "btn", onOpenChange }: PopoverProps) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const place = useCallback(() => {
    const node = panel.current, source = button.current;
    if (!node || !source || supportsAnchor()) return;
    node.style.position = "fixed"; node.style.inset = "auto"; node.style.margin = "0";
    const a = source.getBoundingClientRect();
    const w = node.offsetWidth, h = node.offsetHeight;
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const rtl = getComputedStyle(node).direction === "rtl";
    const alignLeft = rtl ? align === "end" : align === "start";
    let top = a.bottom + 4;
    if (top + h > vh - 4 && a.top - 4 - h >= 4) top = a.top - 4 - h;
    let left = alignLeft ? a.left : a.right - w;
    if (left + w > vw - 4) left = a.right - w;
    node.style.top = `${Math.max(4, Math.min(top, vh - h - 4))}px`;
    node.style.left = `${Math.max(4, Math.min(left, vw - w - 4))}px`;
  }, [align]);

  useEffect(() => {
    const node = panel.current;
    if (!node) return;
    const onToggle = (event: Event) => {
      const next = (event as ToggleEvent).newState === "open";
      setOpen(next);
      if (next) place();
      onOpenChange?.(next);
    };
    node.addEventListener("toggle", onToggle);
    return () => node.removeEventListener("toggle", onToggle);
  }, [place, onOpenChange]);

  return <>
    <button ref={button} type="button" className={triggerClassName} popoverTarget={id} aria-expanded={open} aria-label={triggerLabel}>{trigger}</button>
    <div ref={panel} id={id} popover="auto" role="group" className={`popover${align === "start" ? " popover--start" : ""}`} aria-label={label}>{children}</div>
  </>;
}
