import { useId, type ReactNode } from "react";

export interface SettingProps {
  label: ReactNode;
  hint?: ReactNode;
  /** Width step for a text, number or select control; omit for a switch or button, which keep their own size. */
  size?: "sm" | "md" | "lg";
  /** The control. It receives the id the label points at through the render form: children={id => <input id={id} className="input" />}. */
  children: ReactNode | ((controlId: string) => ReactNode);
}

/** A settings row: label and hint on the start side, one compact control on the end side. */
export function Setting({ label, hint, size, children }: SettingProps) {
  const id = useId();
  return (
    <div className="setting">
      <div className="setting__text">
        <label className="setting__label" htmlFor={id}>{label}</label>
        {hint ? <span className="setting__hint">{hint}</span> : null}
      </div>
      <div className={`setting__control${size ? ` setting__control--${size}` : ""}`}>
        {typeof children === "function" ? children(id) : children}
      </div>
    </div>
  );
}
