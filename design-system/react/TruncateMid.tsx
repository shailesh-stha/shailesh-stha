export interface TruncateMidProps {
  /** The full value (an id, a file name, a path). */
  value: string;
  /** Characters always kept at the end. Default 10. */
  tail?: number;
  className?: string;
}

/** Middle truncation: the start shrinks with an ellipsis when the box is narrow, the last `tail` characters stay. The full value is in title and for screen readers. */
export function TruncateMid({ value, tail = 10, className }: TruncateMidProps) {
  const cut = Math.max(0, value.length - tail);
  return (
    <span className={["truncate-mid", className].filter(Boolean).join(" ")} title={value}>
      {cut > 0 && <span className="truncate-mid__head" aria-hidden="true">{value.slice(0, cut)}</span>}
      <span className="truncate-mid__tail" aria-hidden="true">{value.slice(cut)}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
