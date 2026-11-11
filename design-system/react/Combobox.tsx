import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";

export interface ComboboxOption { value: string; label: string; group?: string; disabled?: boolean }

export interface ComboboxProps {
  options: ComboboxOption[];
  /** Selected values. A single select has zero or one entry. */
  value: string[];
  onChange: (value: string[]) => void;
  /** Several values; the selected ones show as chips under the field and the list stays open while choosing. */
  multiple?: boolean;
  /** Accessible name when there is no visible <label htmlFor={id}>. */
  "aria-label"?: string;
  /** id of the input, so a <label htmlFor> can name it. */
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  "aria-describedby"?: string;
  /** Async: called (with the typed text) instead of filtering locally. Pass the matching options and `loading` while the request runs. */
  onQueryChange?: (query: string) => void;
  loading?: boolean;
  emptyText?: string;
  loadingText?: string;
  /** Polite announcement of the number of matches. */
  resultsText?: (count: number) => string;
  removeLabel?: (label: string) => string;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** ARIA 1.2 combobox with list autocomplete: focus stays in the input, the list is a listbox, aria-activedescendant names the highlighted option.
 *  Keys: ArrowDown/Up (open and move), Home/End (while an option is highlighted), Enter (choose), Escape (close, then clear), Tab (close; chooses a highlighted option in a single select). */
export function Combobox({
  options, value, onChange, multiple = false, id, placeholder, disabled, invalid, onQueryChange, loading = false,
  emptyText = "No results", loadingText = "Loading...", resultsText = n => `${n} results available`, removeLabel = label => `Remove ${label}`, ...aria
}: ComboboxProps) {
  const base = useId();
  const inputId = id ?? `${base}-input`;
  const listId = `${base}-list`;
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [active, setActive] = useState(-1);
  const [navigated, setNavigated] = useState(false);
  const [message, setMessage] = useState("");

  const labelOf = (v: string) => options.find(o => o.value === v)?.label ?? v;
  const text = dirty ? query : multiple ? query : value[0] ? labelOf(value[0]) : query;
  const visible = useMemo(() => {
    const q = dirty && !onQueryChange ? fold(query.trim()) : "";
    return options.filter(o => !q || fold(o.label).includes(q));
  }, [options, query, dirty, onQueryChange]);
  const enabled = visible.map((o, index) => ({ o, index })).filter(x => !x.o.disabled);
  const showList = open && !loading && visible.length > 0;

  useEffect(() => {
    if (!open || loading) return;
    const timer = window.setTimeout(() => setMessage(visible.length === 0 ? emptyText : resultsText(visible.length)), 250);
    return () => window.clearTimeout(timer);
  }, [open, loading, visible.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const optionId = (index: number) => `${base}-option-${index}`;
  const close = () => { setOpen(false); setActive(-1); setNavigated(false); };
  const reset = () => { setDirty(false); setQuery(""); };
  const choose = (option: ComboboxOption | undefined) => {
    if (!option || option.disabled) return;
    if (multiple) {
      const next = value.includes(option.value) ? value.filter(v => v !== option.value) : [...value, option.value];
      onChange(next); reset();
      setMessage(`${option.label} ${value.includes(option.value) ? "removed" : "selected"}`);
    } else { onChange([option.value]); reset(); close(); setMessage(`${option.label} selected`); }
  };
  const move = (delta: number, to?: "first" | "last") => {
    if (!enabled.length) return;
    const at = enabled.findIndex(x => x.index === active);
    const next = to === "first" ? 0 : to === "last" ? enabled.length - 1 : at < 0 ? (delta > 0 ? 0 : enabled.length - 1) : (at + delta + enabled.length) % enabled.length;
    setNavigated(true); setActive(enabled[next].index);
  };
  useEffect(() => { if (active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" }); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.ctrlKey || event.metaKey) return;
    const k = event.key;
    if (k === "ArrowDown") {
      event.preventDefault();
      if (!open) { setOpen(true); if (!event.altKey) { const sel = enabled.find(x => value.includes(x.o.value)); setNavigated(true); setActive(sel ? sel.index : enabled[0]?.index ?? -1); } }
      else if (!event.altKey) move(1);
    } else if (k === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); if (!event.altKey) move(-1, "last"); } else move(-1);
    } else if ((k === "Home" || k === "End") && open && active >= 0) { event.preventDefault(); move(0, k === "Home" ? "first" : "last"); }
    else if (k === "Enter") { if (open && active >= 0) { event.preventDefault(); choose(visible[active]); } }
    else if (k === "Escape") {
      if (open) { event.preventDefault(); event.stopPropagation(); close(); }
      else if (text) { event.preventDefault(); event.stopPropagation(); reset(); if (!multiple) onChange([]); onQueryChange?.(""); }
    } else if (k === "Tab") { if (open && active >= 0 && navigated && !multiple) choose(visible[active]); else close(); }
  };

  const groups: { name?: string; items: { o: ComboboxOption; index: number }[] }[] = [];
  visible.forEach((o, index) => {
    const last = groups[groups.length - 1];
    if (last && last.name === o.group) last.items.push({ o, index }); else groups.push({ name: o.group, items: [{ o, index }] });
  });
  const renderOption = ({ o, index }: { o: ComboboxOption; index: number }) => (
    <div key={o.value} id={optionId(index)} role="option" className="combobox__option" aria-selected={value.includes(o.value)} aria-disabled={o.disabled || undefined}
      data-active={index === active ? "" : undefined} onMouseDown={e => e.preventDefault()} onMouseEnter={() => !o.disabled && setActive(index)} onClick={() => choose(o)}>{o.label}</div>
  );

  return <>
    <div className="combobox" ref={root} onBlur={event => {
      if (event.relatedTarget && root.current?.contains(event.relatedTarget as Node)) return;
      close(); reset();
    }}>
      <input ref={input} id={inputId} className="input combobox__input" role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" autoComplete="off"
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined} aria-invalid={invalid || undefined} aria-label={aria["aria-label"]} aria-describedby={aria["aria-describedby"]}
        placeholder={placeholder} disabled={disabled} value={text}
        onChange={event => { setQuery(event.target.value); setDirty(true); setOpen(true); setActive(-1); onQueryChange?.(event.target.value); }}
        onClick={() => setOpen(true)} onKeyDown={onKeyDown} />
      <div id={listId} className="combobox__list" role="listbox" aria-multiselectable={multiple || undefined} aria-label={aria["aria-label"]} aria-busy={loading} hidden={!showList}>
        {groups.map((g, i) => g.name
          ? <div key={`${g.name}-${i}`} className="combobox__group" role="group" aria-label={g.name} data-label={g.name}>{g.items.map(renderOption)}</div>
          : <Fragment key={i}>{g.items.map(renderOption)}</Fragment>)}
      </div>
      {open && (loading || visible.length === 0) && <div className="combobox__empty" data-loading={loading ? "" : undefined}>{loading ? loadingText : emptyText}</div>}
      <div className="sr-only" role="status" aria-live="polite">{message}</div>
    </div>
    {multiple && value.length > 0 && <div className="combobox__chips">
      {value.map(v => <span key={v} className="badge badge--accent">{labelOf(v)}
        <button type="button" className="badge__remove" aria-label={removeLabel(labelOf(v))} onClick={() => { onChange(value.filter(x => x !== v)); setMessage(`${labelOf(v)} removed`); input.current?.focus(); }}><Icon name="x" /></button>
      </span>)}
    </div>}
  </>;
}
