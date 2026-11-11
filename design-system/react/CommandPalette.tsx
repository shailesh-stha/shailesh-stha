import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./icon-names";

export interface CommandItem {
  /** Returned to onSelect. */
  value: string;
  label: string;
  icon?: IconName;
  /** Shortcut keys shown at the end, e.g. ["Ctrl", "N"] (display only). */
  shortcut?: string[];
  /** Extra search words (synonyms). */
  keywords?: string;
  /** Navigates instead of calling onSelect only. */
  href?: string;
  disabled?: boolean;
}
export interface CommandGroup { heading: string; items: CommandItem[] }

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  groups: CommandGroup[];
  /** Called with the chosen item before the palette closes. */
  onSelect: (item: CommandItem) => void;
  /** Accessible name of the dialog. Default "Command palette". */
  label?: string;
  placeholder?: string;
  /** Text when nothing matches. */
  emptyText?: string;
  /** Toggle with Ctrl/Cmd+K: called with the new open state. Leave out to disable the hotkey. */
  onToggleHotkey?: (open: boolean) => void;
}

const fold = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Command palette on a native <dialog> with the combobox/listbox pattern: focus stays in the input, aria-activedescendant marks the active option,
 *  typing filters, Enter runs it, Escape closes, the result count is announced. */
export function CommandPalette({ open, onClose, groups, onSelect, label = "Command palette", placeholder = "Type a command or search…", emptyText = "No matching commands", onToggleHotkey }: CommandPaletteProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const base = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const closing = useRef(onClose);
  closing.current = onClose;

  const filtered = useMemo(() => {
    const terms = fold(query).split(/\s+/).filter(Boolean);
    return groups
      .map(group => ({ heading: group.heading, items: group.items.filter(item => { const hay = fold(`${item.label} ${item.keywords ?? ""}`); return terms.every(term => hay.includes(term)); }) }))
      .filter(group => group.items.length > 0);
  }, [groups, query]);
  const flat = useMemo(() => filtered.flatMap(group => group.items).filter(item => !item.disabled), [filtered]);
  const total = filtered.reduce((sum, group) => sum + group.items.length, 0);
  const idOf = (value: string) => `${base}-${value.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) { setQuery(""); dialog.showModal(); input.current?.focus(); }
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onNativeClose = () => closing.current();
    dialog.addEventListener("close", onNativeClose);
    return () => dialog.removeEventListener("close", onNativeClose);
  }, []);
  useEffect(() => { setActive(flat[0]?.value ?? null); }, [flat]);
  useEffect(() => {
    if (!onToggleHotkey) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") { event.preventDefault(); onToggleHotkey(!open); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onToggleHotkey, open]);
  useEffect(() => { if (active) document.getElementById(idOf(active))?.scrollIntoView({ block: "nearest" }); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (item: CommandItem) => {
    if (item.disabled) return;
    onSelect(item);
    ref.current?.close();
    if (item.href) window.location.assign(item.href);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const at = flat.findIndex(item => item.value === active);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!flat.length) return;
      const next = event.key === "ArrowDown" ? (at + 1) % flat.length : (at <= 0 ? flat.length - 1 : at - 1);
      setActive(flat[next].value);
    } else if (event.key === "PageDown") { event.preventDefault(); setActive(flat[flat.length - 1]?.value ?? null); }
    else if (event.key === "PageUp") { event.preventDefault(); setActive(flat[0]?.value ?? null); }
    else if (event.key === "Enter" && at >= 0) { event.preventDefault(); run(flat[at]); }
  };

  const listId = `${base}-list`;
  return <dialog ref={ref} className="command" aria-label={label}
    onMouseDown={event => {
      if (event.target !== event.currentTarget) return;
      const r = event.currentTarget.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.currentTarget.close();
    }}>
    <input ref={input} className="command__input" role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list" aria-activedescendant={active ? idOf(active) : undefined}
      aria-label={label} placeholder={placeholder} autoComplete="off" spellCheck={false} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown} />
    <div className="command__list" role="listbox" id={listId} aria-label={label}>
      {filtered.map(group => <div className="command__group" role="group" aria-label={group.heading} key={group.heading}>
        <div className="command__heading" role="presentation">{group.heading}</div>
        {group.items.map(item => {
          const content = <>
            {item.icon && <Icon name={item.icon} />}
            <span className="command__label">{item.label}</span>
            {item.shortcut && <span className="command__shortcut">{item.shortcut.map(key => <kbd key={key}>{key}</kbd>)}</span>}
          </>;
          const props = { id: idOf(item.value), role: "option", className: "command__item", "aria-selected": item.value === active, "aria-disabled": item.disabled ? true : undefined, onClick: (event: React.MouseEvent) => { event.preventDefault(); run(item); }, onMouseMove: () => { if (!item.disabled && item.value !== active) setActive(item.value); } } as const;
          return item.href ? <a key={item.value} href={item.href} {...props}>{content}</a> : <div key={item.value} {...props}>{content}</div>;
        })}
      </div>)}
      {total === 0 && <div className="command__empty">{emptyText}</div>}
    </div>
    <div className="sr-only" role="status" aria-live="polite">{total === 0 ? emptyText : `${total} ${total === 1 ? "result" : "results"}`}</div>
  </dialog>;
}
