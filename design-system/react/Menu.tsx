import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./icon-names";

export interface MenuItem {
  label: string;
  /** Runs when the item is chosen. Optional for a link item (`href`), which then simply follows its link. */
  onSelect?: () => void;
  /** Makes the item a real link (<a role="menuitem">), so middle-click, Ctrl/Cmd+click and "Open in new tab" work. A plain click closes the menu and
   *  runs `onSelect` (a single-page app navigates with its router and the default navigation is cancelled); a click with a modifier key, or a
   *  middle-click, is left to the browser. Not combined with `checked`. */
  href?: string;
  disabled?: boolean;
  /** Destructive action: shown in the error colour. */
  danger?: boolean;
  /** Tooltip, e.g. why an item is disabled. */
  title?: string;
  /** Leading icon. */
  icon?: IconName;
  /** Keyboard shortcut hint shown at the end, e.g. "Ctrl+Z" (display only). */
  shortcut?: string;
  /** Makes it a checkable item (menuitemcheckbox) showing this state; flip your own state in onSelect. */
  checked?: boolean;
  /** With `checked`: a radio item (menuitemradio) instead of a checkbox. */
  radio?: boolean;
  /** Keep the menu open after choosing this item (useful for checkboxes). */
  keepOpen?: boolean;
}
/** A horizontal rule between groups of items. */
export interface MenuSeparator { separator: true }
/** A small group label. */
export interface MenuHeading { heading: string }
export type MenuEntry = MenuItem | MenuSeparator | MenuHeading;

export interface MenuProps {
  /** Accessible name of the trigger button, e.g. "Actions for Session one". */
  label: string;
  items: MenuEntry[];
  /** Trigger content; defaults to the ellipsis icon. */
  trigger?: ReactNode;
  /** Visible text for the trigger (File, Edit, More views): renders a text button (btn btn--ghost btn--sm) instead of the icon-sized one.
   *  The text is the button's accessible name, so `label` then only names the menu. Wins over `trigger`. */
  triggerText?: ReactNode;
  /** Open towards the right edge (default) or the left edge of the trigger. */
  align?: "end" | "start";
  /** Render the open menu in the top layer (popover) so a scrolling or clipping ancestor, such as a table wrapper, cannot cut it off.
   *  It is placed against the trigger (flips above when there is no room below), limited to the viewport, and stays against the trigger when the page or a scroll
   *  container moves it (or the window is resized) and closes once the trigger scrolls out of sight; a scroll that does not move the trigger leaves it open. Default false: the menu stays inside the .anchor as before. */
  portal?: boolean;
  /** Trigger size: "sm" (default, a compact 24px-high button) or "md" (the standard icon button, same size as btn--icon elsewhere). */
  size?: "sm" | "md";
  /** Value picker: the trigger is a form select box (the same `.select` as a native select) showing `triggerText`, and the items are radio
   *  items (one value) or checkbox items with `keepOpen` (several). The panel is at least as wide as the trigger. */
  picker?: boolean;
  /** "picker": the panel gets the picker look (at least as wide as the trigger, chosen row tinted with a check at its end, radio items without a dot)
   *  while the trigger stays what `trigger` / `triggerText` / `size` say, e.g. an icon button. `picker` already implies it. */
  panel?: "menu" | "picker";
  /** Fixed panel width (`menu--fixed`): 1.5 menu widths at most the screen width; long labels wrap. For pickers with long option names. */
  fixedWidth?: boolean;
  /** Tooltip (title) on the trigger button, e.g. the name of an icon-only trigger. */
  triggerTitle?: string;
  /** Adds a search field at the top of the panel; it filters the items by label and takes focus when the menu opens. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Shown when the search matches nothing. */
  emptyText?: string;
  /** One action kept at the bottom of the panel (below a line, always visible while the list scrolls), e.g. "Manage models". */
  footer?: Pick<MenuItem, "label" | "onSelect" | "icon" | "disabled" | "title">;
  /** Called each time the menu opens (e.g. to refresh the list). */
  onOpen?: () => void;
  disabled?: boolean;
  /** Id of the trigger button, so a <label htmlFor> can name it. */
  id?: string;
  /** Extra classes for the wrapper (layout only: width, flex). */
  className?: string;
}

const GAP = 4;

const isSeparator = (entry: MenuEntry): entry is MenuSeparator => "separator" in entry;
const isHeading = (entry: MenuEntry): entry is MenuHeading => "heading" in entry;

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Items whose label matches the query; a heading or separator stays only when an item follows it in its group. */
function filterEntries(entries: MenuEntry[], query: string): MenuEntry[] {
  const q = fold(query.trim());
  if (!q) return entries;
  const hits = entries.filter(entry => isSeparator(entry) || isHeading(entry) || fold(entry.label).includes(q));
  const out: MenuEntry[] = [];
  hits.forEach((entry, index) => {
    if (isSeparator(entry) || isHeading(entry)) {
      const next = hits[index + 1];
      if (!next || isSeparator(next) || isHeading(next)) return;
      if (isSeparator(entry) && out.length === 0) return;
    }
    out.push(entry);
  });
  return out;
}

/** Button + menu with the full keyboard pattern: arrows, Home/End, typeahead, Escape (focus returns), Tab closes, outside click closes. */
export function Menu({ label, items, trigger, triggerText, align = "end", portal = false, size = "sm", picker = false, panel: panelKind = "menu", fixedWidth = false, triggerTitle, searchable = false, searchPlaceholder = "Search", emptyText = "No results", footer, onOpen, disabled, id, className }: MenuProps) {
  const pickerPanel = picker || panelKind === "picker";
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", timer: 0 });
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => filterEntries(items, query), [items, query]);
  const menuId = useId();
  const enabled = () => Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled):not([aria-disabled="true"])') ?? []);

  /* Portal mode: show the panel in the top layer and place it against the trigger (position: fixed, viewport clamped). */
  const place = useCallback(() => {
    const node = panel.current, source = button.current;
    if (!node || !source) return;
    node.style.position = "fixed"; node.style.inset = "auto"; node.style.margin = "0"; node.style.maxBlockSize = "";
    node.style.setProperty("position-area", "none");
    if (pickerPanel) node.style.minWidth = `${source.getBoundingClientRect().width}px`;
    const a = source.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const below = vh - a.bottom - 2 * GAP, above = a.top - 2 * GAP;
    const fits = node.offsetHeight <= below;
    const up = !fits && above > below;
    node.style.maxBlockSize = `${Math.max(up ? above : below, Math.min(node.offsetHeight, 96))}px`;
    const w = node.offsetWidth, h = node.offsetHeight;
    const rtl = getComputedStyle(node).direction === "rtl";
    const alignLeft = rtl ? align === "end" : align === "start";
    const top = up ? a.top - GAP - h : a.bottom + GAP;
    let left = alignLeft ? a.left : a.right - w;
    if (left + w > vw - GAP) left = a.right - w;
    node.style.top = `${Math.max(GAP, Math.min(top, vh - h - GAP))}px`;
    node.style.left = `${Math.max(GAP, Math.min(left, vw - w - GAP))}px`;
    node.setAttribute("data-placed", "");
  }, [align, pickerPanel]);

  useLayoutEffect(() => {
    if (!open || !portal) return;
    const node = panel.current;
    if (!node) return;
    try { if (!node.matches(":popover-open")) node.showPopover?.(); } catch { /* not connected or unsupported: the fixed placement below still applies */ }
    place();
  }, [open, portal, place]);

  // The panel is fixed, so it follows its trigger: re-placed when the trigger moved (scroll of its container, resize), closed once the trigger is out of sight.
  // A scroll that does not move the trigger (a carousel, a streaming chat, a log following its tail) leaves the menu alone.
  useEffect(() => {
    if (!open || !portal) return;
    const source = button.current;
    if (!source) return;
    let last = source.getBoundingClientRect();
    const follow = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      const now = source.getBoundingClientRect();
      if (now.left === last.left && now.top === last.top && now.width === last.width && now.height === last.height) return;
      last = now;
      place();
    };
    const seen = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(entries => { if (!entries[entries.length - 1].isIntersecting) setOpen(false); }) : null;
    seen?.observe(source);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => { seen?.disconnect(); window.removeEventListener("scroll", follow, true); window.removeEventListener("resize", follow); };
  }, [open, portal, place]);

  useEffect(() => {
    if (!open) return;
    if (searchable) search.current?.focus({ preventScroll: portal }); else enabled()[0]?.focus({ preventScroll: portal });
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, portal, searchable]);

  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return;
    const list = enabled();
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const go = (index: number) => { event.preventDefault(); list[(index + list.length) % list.length]?.focus(); };
    if (event.key === "ArrowDown") go(at + 1);
    else if (event.key === "ArrowUp") { if (searchable && at === 0) { event.preventDefault(); search.current?.focus(); } else go(at <= 0 ? list.length - 1 : at - 1); }
    else if (event.key === "Home" && !(searchable && document.activeElement === search.current)) go(0);
    else if (event.key === "End" && !(searchable && document.activeElement === search.current)) go(list.length - 1);
    else if (event.key === "Escape") { event.stopPropagation(); setOpen(false); button.current?.focus(); }
    else if (event.key === "Tab") setOpen(false);
    else if (!searchable && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== " ") {
      // Typeahead: jump to the next item whose label starts with what was typed.
      window.clearTimeout(typed.current.timer);
      typed.current.text += event.key.toLowerCase();
      typed.current.timer = window.setTimeout(() => { typed.current.text = ""; }, 600);
      const needle = typed.current.text.split("").every(c => c === typed.current.text[0]) ? typed.current.text[0] : typed.current.text;
      const ordered = [...list.slice(at + 1), ...list.slice(0, at + 1)];
      const hit = ordered.find(item => item.textContent?.trim().toLowerCase().startsWith(needle));
      if (hit) { event.preventDefault(); hit.focus(); }
    }
  };

  const triggerClass = picker
    ? "select"
    : `btn btn--ghost${size === "sm" ? " btn--sm" : ""}${triggerText === undefined ? " btn--icon" : ""}`;
  const triggerContent = picker
    ? <>{trigger}<span className="truncate">{triggerText}</span></>
    : triggerText ?? trigger ?? <Icon name="ellipsis" size={size === "md" ? "md" : undefined} />;

  return <span className={`anchor${className ? ` ${className}` : ""}`} ref={root} onKeyDown={onKeyDown}>
    <button ref={button} id={id} type="button" disabled={disabled} className={triggerClass} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} aria-label={triggerText === undefined ? label : undefined} title={triggerTitle}
      onClick={() => setOpen(current => { if (!current) onOpen?.(); return !current; })}>{triggerContent}</button>
    {open && <div ref={panel} id={menuId} popover={portal ? "manual" : undefined} className={`menu${align === "start" ? " menu--start" : ""}${pickerPanel ? " menu--picker" : ""}${fixedWidth ? " menu--fixed" : ""}`} role="menu" aria-label={label}>
      {searchable && <div className="menu__search"><input ref={search} type="search" className="input" placeholder={searchPlaceholder} aria-label={searchPlaceholder} value={query} onChange={event => setQuery(event.target.value)} /></div>}
      {searchable && shown.length === 0 && <div className="menu__label" role="presentation">{emptyText}</div>}
      {shown.map((entry, index) => {
        if (isSeparator(entry)) return <div key={`sep-${index}`} className="menu__separator" role="separator" />;
        if (isHeading(entry)) return <div key={`head-${entry.heading}`} className="menu__label" role="presentation">{entry.heading}</div>;
        const role = entry.checked === undefined ? "menuitem" : entry.radio ? "menuitemradio" : "menuitemcheckbox";
        const body = <>
          {entry.icon ? <Icon name={entry.icon} /> : entry.checked !== undefined && !(pickerPanel && entry.radio) ? <Icon name={entry.radio ? "circle-dot" : "check"} /> : null}
          {entry.label}
          {entry.checked !== undefined && (entry.icon || (pickerPanel && entry.radio)) && <span className="menu__check"><Icon name="check" /></span>}
          {entry.shortcut && <span className="menu__shortcut">{entry.shortcut}</span>}
        </>;
        if (entry.href !== undefined && entry.checked === undefined) {
          return <a key={`${index}-${entry.label}`} role="menuitem" className="menu__item" href={entry.disabled ? undefined : entry.href} title={entry.title}
            aria-disabled={entry.disabled ? true : undefined}
            data-icon={entry.icon ? "true" : undefined}
            data-danger={entry.danger ? "true" : undefined}
            onClick={event => {
              if (entry.disabled) { event.preventDefault(); return; }
              // Middle-click never reaches onClick; a click with a modifier key opens a new tab or window and must stay a plain link.
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              if (entry.onSelect) event.preventDefault();
              if (!entry.keepOpen) { setOpen(false); button.current?.focus(); }
              entry.onSelect?.();
            }}>{body}</a>;
        }
        return <button key={`${index}-${entry.label}`} type="button" role={role} className="menu__item" disabled={entry.disabled} title={entry.title}
          aria-checked={entry.checked === undefined ? undefined : entry.checked}
          data-icon={entry.icon || (pickerPanel && entry.radio) ? "true" : undefined}
          data-danger={entry.danger ? "true" : undefined}
          onClick={() => { if (!entry.keepOpen) { setOpen(false); button.current?.focus(); } entry.onSelect?.(); }}>
          {body}
        </button>;
      })}
      {footer && <div className="menu__footer" role="presentation">
        <button type="button" role="menuitem" className="menu__item" disabled={footer.disabled} title={footer.title} data-icon={footer.icon ? "true" : undefined}
          onClick={() => { setOpen(false); button.current?.focus(); footer.onSelect?.(); }}>
          {footer.icon && <Icon name={footer.icon} />}
          {footer.label}
        </button>
      </div>}
    </div>}
  </span>;
}
