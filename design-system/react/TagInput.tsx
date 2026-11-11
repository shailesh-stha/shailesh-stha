import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export type TagRejection = "pattern" | "duplicate" | "max" | "rejected";

export interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  /** Accessible name of the text box when there is no <label htmlFor={id}>. */
  "aria-label"?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Regular expression a tag must match. */
  pattern?: RegExp;
  /** Return false to refuse a tag (reason "rejected"). */
  validate?: (tag: string, current: string[]) => boolean;
  max?: number;
  allowDuplicates?: boolean;
  /** Add the typed text when the box loses focus. */
  addOnBlur?: boolean;
  /** Called when a tag is refused, e.g. to show a message next to the field. */
  onInvalid?: (tag: string, reason: TagRejection) => void;
  removeLabel?: (tag: string) => string;
  "aria-describedby"?: string;
}

/** Free-text tags: Enter or comma adds, pasted text is split, Backspace in an empty box removes the last tag. A refused tag stays in the box with aria-invalid. */
export function TagInput({
  value, onChange, id, placeholder, disabled, pattern, validate, max, allowDuplicates, addOnBlur, onInvalid, removeLabel = tag => `Remove ${tag}`, ...aria
}: TagInputProps) {
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const announce = (m: string) => setMessage(m);
  useEffect(() => { if (!message) return; const t = window.setTimeout(() => setMessage(""), 4000); return () => window.clearTimeout(t); }, [message]);

  const refuse = (tag: string, reason: TagRejection) => { setInvalid(true); onInvalid?.(tag, reason); announce(`${tag} was not added`); return false; };
  const add = (raw: string, current: string[]) => {
    const tag = raw.trim();
    if (!tag) return current;
    if (max && current.length >= max) { refuse(tag, "max"); return current; }
    if (!allowDuplicates && current.some(t => t.toLowerCase() === tag.toLowerCase())) { refuse(tag, "duplicate"); return current; }
    if (pattern && !pattern.test(tag)) { refuse(tag, "pattern"); return current; }
    if (validate && !validate(tag, current)) { refuse(tag, "rejected"); return current; }
    setInvalid(false); announce(`${tag} added`);
    return [...current, tag];
  };
  const commit = () => { const next = add(text, value); if (next !== value) { onChange(next); setText(""); } };
  const remove = (tag: string) => { onChange(value.filter(t => t !== tag)); announce(`${tag} removed`); input.current?.focus(); };

  return <div className="tag-input" aria-disabled={disabled || undefined} onClick={event => { if (event.target === event.currentTarget) input.current?.focus(); }}>
    {value.map(tag => <span key={tag} className="badge badge--accent">{tag}
      <button type="button" className="badge__remove" aria-label={removeLabel(tag)} disabled={disabled} onClick={() => remove(tag)}><Icon name="x" /></button>
    </span>)}
    <input ref={input} id={id} className="tag-input__input" value={text} placeholder={placeholder} disabled={disabled} aria-label={aria["aria-label"]} aria-describedby={aria["aria-describedby"]} aria-invalid={invalid || undefined}
      onChange={event => { setText(event.target.value); setInvalid(false); }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter" || event.key === ",") { if (event.key === "," || text.trim()) event.preventDefault(); commit(); }
        else if (event.key === "Backspace" && text === "" && value.length) { event.preventDefault(); remove(value[value.length - 1]); }
      }}
      onPaste={event => {
        const pasted = event.clipboardData.getData("text");
        if (!/[,;\t\n\r]/.test(pasted)) return;
        event.preventDefault();
        let next = value;
        pasted.split(/[,;\t\n\r]+/).forEach(part => { next = add(part, next); });
        if (next !== value) onChange(next);
      }}
      onBlur={() => { if (addOnBlur) commit(); }} />
    <span className="sr-only" role="status" aria-live="polite">{message}</span>
  </div>;
}
