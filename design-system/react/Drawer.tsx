import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

export interface DrawerProps {
  /** Controlled: true shows the drawer (as a native modal dialog), false hides it. */
  open: boolean;
  /** Called when the user closes it: Escape, backdrop click or the close button. Set `open` to false in response. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Buttons for the footer. */
  footer?: ReactNode;
  /** Edge it slides in from. Default "end". */
  side?: "start" | "end";
  /** Width: "default" (32rem) or "wide" (72rem) for document and image previews. Both fill the screen on a phone. */
  size?: "default" | "wide";
  /** Ignore backdrop clicks (Escape and the close button still work). */
  static?: boolean;
}

/** Side sheet on a native <dialog>: the browser traps focus, makes the page inert, handles Escape and returns focus to the opener. */
export function Drawer({ open, onClose, title, children, footer, side = "end", size = "default", static: isStatic = false }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closing = useRef(onClose);
  closing.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onNativeClose = () => closing.current();
    dialog.addEventListener("close", onNativeClose);
    return () => dialog.removeEventListener("close", onNativeClose);
  }, []);

  return <dialog ref={ref} className={`drawer${side === "start" ? " drawer--start" : ""}${size === "wide" ? " drawer--wide" : ""}`} aria-labelledby={titleId}
    onMouseDown={event => {
      if (isStatic || event.target !== event.currentTarget) return;
      const r = event.currentTarget.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.currentTarget.close();
    }}>
    <header className="drawer__header">
      <h2 id={titleId}>{title}</h2>
      <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => ref.current?.close()} aria-label="Close"><Icon name="x" /></button>
    </header>
    <div className="drawer__body stack">{children}</div>
    {footer && <footer className="drawer__footer">{footer}</footer>}
  </dialog>;
}
