import type { ThHTMLAttributes } from "react";
import { Icon } from "./Icon";

export type SortDirection = "none" | "ascending" | "descending";

export interface SortableHeaderProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "children" | "onClick" | "aria-sort"> {
  /** Column title shown in the button. */
  label: string;
  /** Current sort state of this column (default "none"). The app owns it. */
  direction?: SortDirection;
  /** Called when the header button is pressed; the app decides the next direction. */
  onSort: () => void;
}

const ICON = { none: "arrow-up-down", ascending: "arrow-up", descending: "arrow-down" } as const;

/** Sortable column header for React tables that own their sort state (the plain-HTML equivalent is table.js with data-sortable):
 *  th[aria-sort] > button.table__sort (label + arrow icon). The icon follows `direction`. */
export function SortableHeader({ label, direction = "none", onSort, ...rest }: SortableHeaderProps) {
  return <th scope="col" {...rest} aria-sort={direction}>
    <button type="button" className="table__sort" onClick={onSort}>{label}<Icon name={ICON[direction]} /></button>
  </th>;
}
