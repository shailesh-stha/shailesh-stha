import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs, topmost last. Only the topmost one reacts to Escape and Tab, so a confirmation on top of a dialog closes alone. */
const stack: symbol[] = [];
let lockedOverflow: string | null = null;

/** The page behind an open dialog does not scroll; restored when the last dialog closes. */
function lockScroll(lock: boolean) {
  const root = document.documentElement;
  if (lock && stack.length === 1 && lockedOverflow === null) { lockedOverflow = root.style.overflow; root.style.overflow = "hidden"; }
  else if (!lock && stack.length === 0 && lockedOverflow !== null) { root.style.overflow = lockedOverflow; lockedOverflow = null; }
}

/** Escape closes, Tab stays inside, the page behind is inert for assistive tech and does not scroll, focus moves in on open and returns to where it was on close. */
function useDialog(onClose: () => void) {
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const id = Symbol("dialog");
    const node = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    stack.push(id);
    lockScroll(true);
    // Everything outside the overlay is hidden from assistive technology while the dialog is open (aria-modal is not honoured everywhere).
    const overlay = node?.parentElement ?? null;
    const hidden: Array<[Element, boolean]> = [];
    if (overlay?.parentElement) {
      for (const sibling of Array.from(overlay.parentElement.children)) {
        if (sibling === overlay || sibling instanceof HTMLScriptElement || sibling.hasAttribute("inert")) continue;
        sibling.setAttribute("inert", "");
        hidden.push([sibling, true]);
      }
    }
    if (node && !node.contains(document.activeElement)) node.focus();
    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (event.key === "Escape") { close.current(); return; }
      if (event.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) { event.preventDefault(); node.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === node)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(id), 1);
      hidden.forEach(([element]) => element.removeAttribute("inert"));
      lockScroll(false);
      previous?.focus?.();
    };
  }, []);
  return ref;
}

export interface ModalProps {
  title: string;
  /** Small label above the title, e.g. "SESSION DETAILS". */
  eyebrow?: string;
  /** Called on Escape, overlay click and the close button. */
  onClose: () => void;
  children: ReactNode;
  /** Buttons for the dialog footer. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Controlled visibility for a dialog that stays mounted. Omitted: it is open while mounted. When false nothing renders and no key, focus or scroll handling is active. */
  isOpen?: boolean;
  /** Manager dialog (`modal--manager`): a fixed-height dialog whose children are a vertical `<Tabs orientation="vertical" responsiveFlush />`. The children are rendered directly, without the scrolling body (each panel has its own `modal__body` and `modal__footer`), so `footer` and `bodyClassName` do not apply. */
  manager?: boolean;
  /** Extra layout class on the `modal__body` wrapper (not used with `manager`). */
  bodyClassName?: string;
}

export function Modal({ isOpen = true, ...props }: ModalProps) {
  return isOpen ? <ModalDialog {...props} /> : null;
}

function ModalDialog({ title, eyebrow, onClose, children, footer, size = "lg", manager = false, bodyClassName }: Omit<ModalProps, "isOpen">) {
  const ref = useDialog(onClose);
  const titleId = useId();
  return <div className="overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={ref} tabIndex={-1} className={`modal modal--${size}${manager ? " modal--manager" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="modal__header">
        <div>{eyebrow && <div className="muted small">{eyebrow}</div>}<h2 className="modal__title" id={titleId}>{title}</h2></div>
        <button className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      </div>
      {manager ? children : <>
        <div className={`modal__body stack${bodyClassName ? ` ${bodyClassName}` : ""}`}>{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </>}
    </section>
  </div>;
}

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  /** Which button takes focus when the dialog opens. Default "confirm" (Enter confirms); pass "cancel" for an action that cannot be undone. */
  initialFocus?: "confirm" | "cancel";
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation for destructive actions (replaces window.confirm). The confirm button is the danger button. */
export function ConfirmDialog({ title, message, confirmLabel, cancelLabel = "Cancel", busy, initialFocus = "confirm", onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useDialog(onCancel);
  const titleId = useId();
  const messageId = useId();
  return <div className="overlay" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <section ref={ref} tabIndex={-1} className="modal modal--sm" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
      <div className="modal__header"><h2 className="modal__title" id={titleId}>{title}</h2></div>
      <div className="modal__body" id={messageId}>{message}</div>
      <div className="modal__footer">
        <button className="btn" autoFocus={initialFocus === "cancel"} onClick={onCancel}>{cancelLabel}</button>
        <button className="btn btn--danger" autoFocus={initialFocus === "confirm"} disabled={busy} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </section>
  </div>;
}
