import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Accessible name of the nav landmark. */
  label?: string;
  previousLabel?: string;
  nextLabel?: string;
  /** Builds the "Page 3 of 12" text shown in narrow containers. */
  statusLabel?: (page: number, pageCount: number) => string;
  /** Page numbers kept on each side of the current page (default 1). */
  siblings?: number;
  /** Page-jump variant: previous, a "3 / 12" readout and next, in place of the page numbers. Clicking the readout turns it into a number input; Enter jumps, Escape or leaving the input cancels. */
  jump?: boolean;
  /** Jump variant: accessible description of the readout and name of the input (default "Go to page"). */
  jumpLabel?: string;
}

/** The numbers to show: first, last, the current page and its neighbours, with "gap" where pages are skipped. */
export function pageRange(page: number, pageCount: number, siblings = 1): (number | "gap")[] {
  const keep = new Set<number>([1, pageCount, page]);
  for (let offset = 1; offset <= siblings; offset++) { keep.add(page - offset); keep.add(page + offset); }
  const numbers = [...keep].filter(n => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  numbers.forEach((n, i) => {
    if (i > 0 && n - numbers[i - 1] === 2) out.push(n - 1);
    else if (i > 0 && n - numbers[i - 1] > 2) out.push("gap");
    out.push(n);
  });
  return out;
}

/** Pagination nav (buttons). Put it in a block-level parent: it collapses by container width (see the pagination fragment). */
export function Pagination({ page, pageCount, onPageChange, label = "Pages", previousLabel = "Previous", nextLabel = "Next", statusLabel = (p, n) => `Page ${p} of ${n}`, siblings = 1, jump = false, jumpLabel = "Go to page" }: PaginationProps) {
  const go = (target: number) => onPageChange(Math.min(Math.max(target, 1), pageCount));
  if (jump) return <PageJump page={page} pageCount={pageCount} go={go} label={label} previousLabel={previousLabel} nextLabel={nextLabel} statusLabel={statusLabel} jumpLabel={jumpLabel} />;
  return <nav className="pagination" aria-label={label}>
    <button type="button" className="pagination__item" data-step="prev" disabled={page <= 1} onClick={() => go(page - 1)}>
      <Icon name="chevron-left" /><span className="pagination__label">{previousLabel}</span>
    </button>
    <span className="pagination__status">{statusLabel(page, pageCount)}</span>
    {pageRange(page, pageCount, siblings).map((entry, index) => entry === "gap"
      ? <span key={`gap-${index}`} className="pagination__ellipsis" aria-hidden="true">…</span>
      : <button key={entry} type="button" className="pagination__item" aria-current={entry === page ? "page" : undefined} aria-label={`Page ${entry}`} onClick={() => go(entry)}>{entry}</button>)}
    <button type="button" className="pagination__item" data-step="next" disabled={page >= pageCount} onClick={() => go(page + 1)}>
      <span className="pagination__label">{nextLabel}</span><Icon name="chevron-right" />
    </button>
  </nav>;
}

interface PageJumpProps { page: number; pageCount: number; go: (page: number) => void; label: string; previousLabel: string; nextLabel: string; statusLabel: (page: number, pageCount: number) => string; jumpLabel: string }

/** The page-jump variant: prev / "3 / 12" / next, where the readout becomes a number input when activated. */
function PageJump({ page, pageCount, go, label, previousLabel, nextLabel, statusLabel, jumpLabel }: PageJumpProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(page));
  const readoutRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  useEffect(() => {
    if (editing || !returnFocus.current) return;
    returnFocus.current = false;
    readoutRef.current?.focus();
  }, [editing]);
  const stop = (apply: boolean) => {
    const target = Number.parseInt(draft, 10);
    if (apply && Number.isFinite(target) && target >= 1 && target <= pageCount) go(target);
    returnFocus.current = true;
    setEditing(false);
  };
  return <nav className="pagination pagination--jump" aria-label={label}>
    <button type="button" className="pagination__item" data-step="prev" aria-label={previousLabel} disabled={page <= 1} onClick={() => go(page - 1)}><Icon name="chevron-left" /></button>
    {editing
      ? <input className="input pagination__input" type="number" inputMode="numeric" min={1} max={pageCount} value={draft} autoFocus aria-label={`${jumpLabel} (1 to ${pageCount})`}
          onFocus={event => event.currentTarget.select()} onChange={event => setDraft(event.target.value)}
          onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); stop(true); } else if (event.key === "Escape") { event.preventDefault(); stop(false); } }}
          onBlur={() => setEditing(false)} />
      : <button ref={readoutRef} type="button" className="pagination__item pagination__jump" aria-label={statusLabel(page, pageCount)} aria-description={jumpLabel} title={jumpLabel}
          onClick={() => { setDraft(String(page)); setEditing(true); }}>{page} / {pageCount}</button>}
    <button type="button" className="pagination__item" data-step="next" aria-label={nextLabel} disabled={page >= pageCount} onClick={() => go(page + 1)}><Icon name="chevron-right" /></button>
  </nav>;
}
