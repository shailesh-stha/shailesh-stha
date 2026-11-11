import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";

export interface NumberFieldProps {
  /** Accessible name of the input (also used in the button names and the live announcement). Not used as the input name when `labelledBy` is set. */
  label?: string;
  /** Id of a visible label element, when the field has one (a Field or Setting label). */
  labelledBy?: string;
  /** Id of the input, so a <label htmlFor> can point at it. */
  id?: string;
  /** Controlled value; null is an empty field. Omit to let the component keep its own. */
  value?: number | null;
  defaultValue?: number | null;
  /** Called with the new number, or null when the field is emptied. Typed values are reported as typed; they are clamped to min and max when the field loses focus. */
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Step of the buttons and the arrow keys (default 1). Use 0.5 together with `decimal` for decimals. */
  step?: number;
  /** Phone keyboard with a decimal separator (default: numbers only). */
  decimal?: boolean;
  /** Names of the buttons (default: "Decrease <label>" and "Increase <label>"). */
  decrementLabel?: string;
  incrementLabel?: string;
  disabled?: boolean;
  name?: string;
}

const decimals = (step: number) => (String(step).split(".")[1] ?? "").length;

/** Number input with minus and plus buttons: the same markup and ARIA as the plain number-field (js/behaviors/number-field.js). A step button is aria-disabled
 *  (not disabled, so focus is kept) at min or max, typing is clamped when the field loses focus, and a polite live region announces "<label>: <value>". */
export function NumberField({ label, labelledBy, id, value, defaultValue = null, onChange, min, max, step = 1, decimal = false, decrementLabel, incrementLabel, disabled = false, name }: NumberFieldProps) {
  const [inner, setInner] = useState<number | null>(defaultValue);
  const current = value === undefined ? inner : value;
  const [text, setText] = useState(current === null ? "" : String(current));
  const [message, setMessage] = useState("");
  const announce = useRef(false);
  const generated = useId();
  const inputId = id ?? generated;

  // Follow a value that changed from outside, without disturbing text that already parses to it ("1." while typing).
  useEffect(() => {
    const parsed = text === "" ? null : Number(text);
    if (parsed !== current && !(parsed !== null && Number.isNaN(parsed) && current === null)) setText(current === null ? "" : String(current));
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!announce.current) return;
    announce.current = false;
    const timer = setTimeout(() => setMessage(`${label ? label + ": " : ""}${current === null ? "empty" : current}`), 250);
    return () => clearTimeout(timer);
  }, [current, label]);

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const commit = (next: number | null) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  const stepBy = (dir: 1 | -1) => {
    if (disabled) return;
    const base = current ?? (min !== undefined && min > 0 ? min : 0);
    const next = clamp(Number((base + dir * step).toFixed(decimals(step))));
    announce.current = true;
    setText(String(next));
    commit(next);
  };
  const atMin = current !== null && min !== undefined && current <= min;
  const atMax = current !== null && max !== undefined && current >= max;
  const subject = label ?? "";

  return <div className="number-field">
    <button type="button" className="btn btn--icon" aria-label={decrementLabel ?? `Decrease ${subject}`.trim()} aria-disabled={atMin ? true : undefined} disabled={disabled}
      onClick={() => { if (!atMin) stepBy(-1); }}><Icon name="minus" /></button>
    <input id={inputId} className="input number-field__input" type="number" inputMode={decimal ? "decimal" : "numeric"} name={name}
      aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} min={min} max={max} step={step} disabled={disabled} value={text}
      onChange={event => {
        setText(event.target.value);
        if (event.target.value === "") commit(null);
        else if (!Number.isNaN(event.target.valueAsNumber)) commit(event.target.valueAsNumber);
      }}
      onBlur={() => {
        if (current === null) return;
        const next = clamp(current);
        if (next !== current) { setText(String(next)); commit(next); }
      }} />
    <button type="button" className="btn btn--icon" aria-label={incrementLabel ?? `Increase ${subject}`.trim()} aria-disabled={atMax ? true : undefined} disabled={disabled}
      onClick={() => { if (!atMax) stepBy(1); }}><Icon name="plus" /></button>
    <div className="sr-only" role="status" aria-live="polite">{message}</div>
  </div>;
}
