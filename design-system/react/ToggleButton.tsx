import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export interface ToggleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "aria-pressed"> {
  /** Controlled state. Omit to let the component keep its own. */
  pressed?: boolean;
  /** Initial state when uncontrolled (default false). */
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** Design classes for the button, e.g. "btn--ghost btn--icon btn--sm". `btn` is always added. */
  className?: string;
  children?: ReactNode;
}

/** A button that stays pressed: aria-pressed flips on each click. Same markup and behaviour as `<button class="btn" data-toggle aria-pressed>` (js/behaviors/toggle.js).
 *  Toggles are independent; to pick one of a few values use Segmented. An icon-only toggle needs an aria-label that names the action, not the state. */
export function ToggleButton({ pressed, defaultPressed = false, onPressedChange, className, onClick, disabled, type = "button", children, ...rest }: ToggleButtonProps) {
  const [inner, setInner] = useState(defaultPressed);
  const on = pressed ?? inner;
  return <button
    {...rest}
    type={type}
    disabled={disabled}
    className={["btn", className].filter(Boolean).join(" ")}
    aria-pressed={on}
    onClick={event => {
      onClick?.(event);
      if (event.defaultPrevented || disabled) return;
      if (pressed === undefined) setInner(!on);
      onPressedChange?.(!on);
    }}
  >{children}</button>;
}
