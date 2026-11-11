import type { ReactNode } from "react";
import { Sizer } from "./Sizer";

export interface StatStripItem {
  label: string;
  value: ReactNode;
  /** The widest text the value can take; reserves its width so the strip does not jump. */
  widest?: ReactNode;
  title?: string;
}

export interface StatStripProps {
  /** Accessible name of the list, e.g. "Training readouts". */
  label: string;
  items: StatStripItem[];
}

/** A compact row of readouts: a small muted label over a bold value. */
export function StatStrip({ label, items }: StatStripProps) {
  return (
    <dl className="stat-strip" aria-label={label}>
      {items.map(it => (
        <div key={it.label} className="stat-strip__item" title={it.title}>
          <dt className="stat-strip__label">{it.label}</dt>
          <dd className="stat-strip__value">{it.widest !== undefined ? <Sizer widest={it.widest}>{it.value}</Sizer> : it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
