import { Icon } from "./Icon";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";
export interface ToastAction { label: string; run: () => void }
export interface ToastOptions {
  /** Kept for compatibility; every toast uses the shared four-second duration. */
  duration?: number;
  onDismiss?: () => void;
}
interface ToastItem { id: number; message: string; type: ToastType; action?: ToastAction; onDismiss?: () => void }
export type PushToast = (message: string, type?: ToastType, action?: ToastAction, options?: ToastOptions) => void;

const ToastContext = createContext<PushToast>(() => {});
const LabelsContext = createContext({ dismiss: "Dismiss", region: "Notifications" });
export const useToast = () => useContext(ToastContext);

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const labels = useContext(LabelsContext);
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const removalTimer = useRef(0);
  const finish = useCallback(() => {
    onDismiss(toast.id);
    toast.onDismiss?.();
  }, [onDismiss, toast]);
  const dismiss = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    setLeaving(true);
    removalTimer.current = window.setTimeout(finish, 160);
  }, [finish]);
  useEffect(() => {
    const timer = window.setTimeout(dismiss, 4000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(removalTimer.current);
    };
  }, [dismiss]);

  return <div className={`toast toast--${toast.type}`} data-leaving={leaving ? "" : undefined} role={toast.type === "error" ? "alert" : "status"}
    onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); dismiss(); } }}>
    <span className="toast__message">{toast.message}</span>
    {toast.action && <button className="btn btn--sm" onClick={() => { toast.action?.run(); dismiss(); }}>{toast.action.label}</button>}
    <button className="btn btn--ghost btn--icon btn--sm" onClick={dismiss} aria-label={labels.dismiss}><Icon name="x" /></button>
  </div>;
}

export interface ToastProviderProps {
  children: ReactNode;
  /** Where the stack sits. Default "top-end". */
  position?: "top-end" | "top" | "bottom" | "bottom-end";
  /** Most toasts shown at once; the oldest is removed first. Default 4. */
  max?: number;
  /** Accessible names, to translate them (proposal 152). Defaults: dismiss "Dismiss", region "Notifications". */
  labels?: { dismiss?: string; region?: string };
}

/** All toasts dismiss after four seconds unless dismissed earlier. Wrap the app once, then call useToast() anywhere. */
export function ToastProvider({ children, position = "top-end", max = 4, labels }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setToasts(current => current.filter(toast => toast.id !== id)), []);
  const push = useCallback<PushToast>((message, type = "success", action, options) => {
    const id = Date.now() + Math.random();
    setToasts(current => [...current, { id, message, type, action, onDismiss: options?.onDismiss }].slice(-max));
  }, [max]);
  const value = useMemo(() => push, [push]);
  const text = useMemo(() => ({ dismiss: labels?.dismiss ?? "Dismiss", region: labels?.region ?? "Notifications" }), [labels?.dismiss, labels?.region]);
  const modifier = position === "top-end" ? "" : ` toast-stack--${position}`;

  return <ToastContext.Provider value={value}><LabelsContext.Provider value={text}>
    {children}
    <div className={`toast-stack${modifier}`} role="region" aria-label={text.region} aria-live="polite" aria-atomic="false">
      {toasts.map(toast => <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />)}
    </div>
  </LabelsContext.Provider></ToastContext.Provider>;
}