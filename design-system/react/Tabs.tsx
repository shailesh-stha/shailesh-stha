import { Fragment, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  /** Stable key; also used in the generated element ids. */
  id: string;
  label: ReactNode;
  /** The panel content. Omit it on every item and pass children to Tabs to share one panel (an editor that switches documents). */
  panel?: ReactNode;
  disabled?: boolean;
  /** Closable tabs: a leading icon (an <Icon />) before the label. */
  icon?: ReactNode;
  /** Closable tabs: file suffix shown after the label as ".suffix"; renaming edits the label only. */
  suffix?: string;
  /** Closable tabs: unsaved changes. Shows a dot and adds "unsaved changes" to the tab's accessible name (the label must be a string). */
  modified?: boolean;
}

/** A non-interactive heading between tabs of a vertical list ({ group: "Parsers" }); skipped by the keyboard, not shown in the horizontal list or the narrow bar. */
export interface TabGroup { group: string }

export interface TabsProps {
  /** Accessible name of the tab list, e.g. "Server details". */
  label: string;
  items: Array<TabItem | TabGroup>;
  /** Controlled selection (a tab id). Omit to let the component keep its own state. */
  value?: string;
  /** Initial tab when uncontrolled (default: the first enabled tab). */
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** "vertical" shows the tab list beside the panel and uses Up/Down. */
  orientation?: "horizontal" | "vertical";
  /** "automatic" (default): focus selects. "manual": arrows move focus, Enter/Space select. */
  activation?: "automatic" | "manual";
  /** Vertical only: fill a bounded pane (a dialog's side list beside its content) with no gap and no wrapping, then place a horizontal tab bar above the panel below 56rem. The parent needs a height. */
  responsiveFlush?: boolean;
  /** Make the tabs and the active panel fill a bounded parent: the panel takes the remaining height. The parent needs a height. */
  fill?: boolean;
  /** Closable tabs (horizontal only): a close button on each tab; Delete closes the focused tab. The page removes the item from `items`. */
  onClose?: (id: string) => void;
  /** Closable tabs (horizontal only): a "new tab" button beside the tab list. */
  onCreate?: () => void;
  /** Renameable tabs: F2 or double-click swaps a tab (string label) for an input; Enter or blur commits, Escape cancels. */
  onRename?: (id: string, name: string) => void;
  /** Accessible name of the new-tab button (default "New tab"). */
  newLabel?: string;
  /** Appended to the accessible name of a modified tab (default "unsaved changes"). */
  modifiedLabel?: string;
  /** One panel shared by every tab, in place of per-item panels; it is labelled by the selected tab. */
  children?: ReactNode;
  className?: string;
  panelClassName?: string;
}

const responsiveFlushQuery = "(max-width: 56rem)";
const subscribeResponsiveFlush = (callback: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(responsiveFlushQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const getResponsiveFlushSnapshot = () => typeof window !== "undefined" && window.matchMedia?.(responsiveFlushQuery).matches === true;
const getResponsiveFlushServerSnapshot = () => false;
const noopSubscribe = () => () => {};
const falseSnapshot = () => false;

/** Tabs with the WAI-ARIA keyboard model: roving tabindex, Left/Right (Up/Down when vertical), Home, End; same markup as js/behaviors/tabs.js. Optional closable, addable and renameable tabs (horizontal). */
export function Tabs({ label, items: entries, value, defaultValue, onChange, orientation = "horizontal", activation = "automatic", responsiveFlush = false, fill = false, onClose: onCloseProp, onCreate, onRename, newLabel = "New tab", modifiedLabel = "unsaved changes", children, className = "", panelClassName = "" }: TabsProps) {
  const base = useId();
  const items = useMemo(() => entries.filter((entry): entry is TabItem => !("group" in entry)), [entries]);
  const firstEnabled = items.find(item => !item.disabled)?.id;
  const [inner, setInner] = useState(defaultValue ?? firstEnabled);
  const wanted = value ?? inner;
  const selected = items.some(item => item.id === wanted) ? wanted : firstEnabled;
  const [focused, setFocused] = useState<string | undefined>(undefined);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const createRef = useRef<HTMLButtonElement>(null);
  const sharedPanelRef = useRef<HTMLDivElement>(null);
  const previousIds = useRef(items.map(item => item.id));
  const skipBlur = useRef<string | null>(null);
  const restoreFocus = useRef<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const respondToWidth = responsiveFlush && orientation === "vertical";
  const narrow = useSyncExternalStore(
    respondToWidth ? subscribeResponsiveFlush : noopSubscribe,
    respondToWidth ? getResponsiveFlushSnapshot : falseSnapshot,
    getResponsiveFlushServerSnapshot,
  );
  const vertical = orientation === "vertical" && !(respondToWidth && narrow);
  const onClose = orientation === "vertical" ? undefined : onCloseProp;
  const shared = children !== undefined;
  const wrapped = Boolean(onClose || onRename);
  const enabled = items.filter(item => !item.disabled);
  const tabId = (id: string) => `${base}-tab-${id}`;
  const panelId = (id: string) => shared ? `${base}-panel` : `${base}-panel-${id}`;

  // Closable tabs: after a tab is added and selected, or one is closed, put focus where the user expects it.
  useEffect(() => {
    const ids = items.map(item => item.id);
    const added = ids.find(id => !previousIds.current.includes(id));
    const closed = previousIds.current.some(id => !ids.includes(id));
    if (added && added === value) refs.current.get(added)?.focus();
    else if (closed) {
      if (selected) refs.current.get(selected)?.focus();
      else if (createRef.current) createRef.current.focus();
      else sharedPanelRef.current?.focus();
    }
    previousIds.current = ids;
  }, [items, value, selected]);
  useEffect(() => {
    if (editing || !restoreFocus.current) return;
    const id = restoreFocus.current;
    restoreFocus.current = null;
    refs.current.get(id)?.focus();
  }, [editing]);

  const beginRename = (item: TabItem) => {
    if (!onRename || item.disabled || typeof item.label !== "string") return;
    skipBlur.current = null;
    setEditing(item.id);
    setEditName(item.label);
  };
  const finishRename = (id: string) => {
    const name = editName.trim();
    skipBlur.current = id;
    if (name) onRename?.(id, name);
    setEditing(null);
  };

  const choose = (id: string) => { if (value === undefined) setInner(id); onChange?.(id); };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const origin = [...refs.current].find(([, node]) => node === event.target)?.[0];
    if (origin !== undefined) {
      if (event.key === "Delete" && onClose) { event.preventDefault(); onClose(origin); return; }
      const item = items.find(entry => entry.id === origin);
      if (event.key === "F2" && onRename && item) { event.preventDefault(); beginRename(item); return; }
    }
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
    const back = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    const current = enabled.findIndex(item => item.id === (focused ?? selected));
    let next = -1;
    if (event.key === forward) next = (current + 1) % enabled.length;
    else if (event.key === back) next = (current - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    if (next < 0 || !enabled[next]) return;
    event.preventDefault();
    const target = enabled[next].id;
    setFocused(target);
    refs.current.get(target)?.focus();
    if (activation === "automatic") choose(target);
  };

  const renderTab = (item: TabItem) => {
    const isSelected = item.id === selected;
    const stop = (focused ?? selected) === item.id;
    const text = typeof item.label === "string" ? `${item.label}${item.suffix ? `.${item.suffix}` : ""}` : null;
    const name = text !== null && item.modified ? `${text}, ${modifiedLabel}` : undefined;
    const hint = [onClose ? `Press Delete to close ${text ?? "this tab"}.` : "", onRename ? "Press F2 to rename it." : ""].filter(Boolean).join(" ");
    const tab = editing === item.id ? (
      <input className="input" aria-label={`Rename ${text ?? item.id}`} value={editName} autoFocus onChange={event => setEditName(event.target.value)}
        onBlur={() => { if (skipBlur.current === item.id) { skipBlur.current = null; return; } finishRename(item.id); }}
        onKeyDown={event => {
          event.stopPropagation();
          if (event.key === "Enter") { restoreFocus.current = item.id; finishRename(item.id); }
          if (event.key === "Escape") { skipBlur.current = item.id; restoreFocus.current = item.id; setEditing(null); }
        }} />
    ) : (
      <button ref={node => { if (node) refs.current.set(item.id, node); else refs.current.delete(item.id); }} type="button" className="tab" role="tab" id={tabId(item.id)}
        aria-selected={isSelected} aria-controls={panelId(item.id)} tabIndex={stop ? 0 : -1} disabled={item.disabled} data-modified={item.modified ? "" : undefined}
        aria-label={name} aria-keyshortcuts={onClose ? "Delete" : undefined} aria-description={hint || undefined}
        onClick={() => { setFocused(undefined); choose(item.id); }} onDoubleClick={() => beginRename(item)}>
        {item.icon}{text !== null && item.suffix ? <span>{text}</span> : item.label}
      </button>
    );
    if (!wrapped) return <Fragment key={item.id}>{tab}</Fragment>;
    return <div key={item.id} className="tabs__item" role="presentation">
      {tab}
      {onClose && editing !== item.id ? <button type="button" className="tabs__close btn btn--ghost btn--icon btn--sm" tabIndex={-1} aria-hidden="true" title={`Close ${text ?? ""}`.trim()} onClick={() => onClose(item.id)}>
        <span className="icon icon--x" aria-hidden="true" />
      </button> : null}
    </div>;
  };

  const list = items.length ? <div className={`tabs${vertical ? " tabs--vertical" : ""}${onClose ? " tabs--closable" : ""}`} role="tablist" aria-label={label} aria-orientation={vertical ? "vertical" : "horizontal"} onKeyDown={onKeyDown}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(undefined); }}>
    {entries.map((entry, index) => "group" in entry
      ? (vertical ? <span key={`group-${index}`} className="tabs__group" role="presentation">{entry.group}</span> : null)
      : renderTab(entry))}
  </div> : null;
  const create = onCreate && orientation === "horizontal" ? <button ref={createRef} type="button" className="tabs-bar__new btn btn--ghost btn--icon btn--sm" aria-label={newLabel} title={newLabel} onClick={onCreate}>
    <span className="icon icon--plus" aria-hidden="true" />
  </button> : null;
  const strip = orientation === "horizontal" && (onClose || create) ? <div className="tabs-bar">{list}{create}</div> : list;
  const panelClass = `tab-panel${panelClassName ? ` ${panelClassName}` : ""}`;
  const panels = shared
    ? <div ref={sharedPanelRef} className={panelClass} id={`${base}-panel`} role={selected ? "tabpanel" : undefined} aria-labelledby={selected ? tabId(selected) : undefined} tabIndex={selected ? undefined : -1}>{children}</div>
    : items.map(item => <div key={item.id} className={panelClass} role="tabpanel" id={panelId(item.id)} aria-labelledby={tabId(item.id)} tabIndex={0} hidden={item.id !== selected}>{item.panel}</div>);

  if (orientation === "vertical") return <div className={`${respondToWidth ? "tabs-layout tabs-layout--responsive-flush" : "tabs-layout"}${fill ? " tabs-fill" : ""}${className ? ` ${className}` : ""}`}>{list}{panels}</div>;
  return <div className={`${fill ? "tabs-fill" : ""}${className ? ` ${className}` : ""}`.trim() || undefined}>{strip}{panels}</div>;
}
