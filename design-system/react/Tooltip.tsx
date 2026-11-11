import { cloneElement, isValidElement, useEffect, useId, useState, type ReactElement, type ReactNode } from "react";

export interface TooltipProps {
  /** The hint: one short text, no markup. */
  text: string;
  /** One control (button, link, icon button). It keeps its own accessible name; the tooltip text is added as its description, so word it as extra help rather than repeating the name. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  /** Side the tip opens on. Choose the side with room: automatic flipping at viewport edges needs the plain-HTML tooltip behaviour. */
  placement?: "top" | "bottom" | "start" | "end";
  /** Where the bubble sits along the control: "center" (default), or "start" / "end" to line it up with that edge when centring would be clipped (a control near the edge of a scroll area). */
  align?: "center" | "start" | "end";
}

/** Text hint for a control, WCAG 1.4.13 compliant: shown on hover and keyboard focus, hoverable, persistent, dismissed with Escape.
 *  Wraps the control in a .tip element and wires aria-describedby to a visually hidden copy of the text. Use it for icon buttons and truncated text, never for essential information. */
export function Tooltip({ text, children, placement = "top", align = "center" }: TooltipProps) {
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setDismissed(true); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const reset = () => { setDismissed(false); setOpen(true); };
  const leave = () => { setDismissed(false); setOpen(false); };
  const control: ReactNode = isValidElement(children) ? cloneElement(children, { "aria-describedby": [children.props["aria-describedby"], id].filter(Boolean).join(" ") }) : children;
  return <span className="tip" data-tip={text} data-tip-placement={placement === "top" ? undefined : placement} data-tip-side={placement === "top" ? undefined : placement} data-tip-shift={align === "center" ? undefined : align} data-tip-dismissed={dismissed ? "" : undefined}
    onMouseEnter={reset} onFocus={reset} onMouseLeave={leave} onBlur={leave}>
    {control}
    <span id={id} className="sr-only">{text}</span>
  </span>;
}
