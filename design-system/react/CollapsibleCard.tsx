import { useId, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export interface CollapsibleCardProps {
  /** Title shown inside the toggle button. */
  title: ReactNode;
  /** Status next to the title, for example a badge. */
  status?: ReactNode;
  /** Buttons at the end of the header. They never open or close the card. */
  actions?: ReactNode;
  /** Always visible below the header, open or closed (for example a progress bar). */
  always?: ReactNode;
  /** The collapsible content. */
  children?: ReactNode;
  /** Controlled: whether the body is open. Omit to let the component keep its own state. */
  open?: boolean;
  /** Initial state when uncontrolled (default: closed). */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Wrap the toggle in a heading of this level so the card shows up in the heading outline (default: none). */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Use the dense card (card--compact). */
  compact?: boolean;
}

/** Card with a disclosure toggle and actions in its header: the toggle (chevron and title) is the only part that opens the body. Native <details> cannot hold
 *  buttons in its summary, so this is a button with aria-expanded and aria-controls (one tab stop, Enter and Space). Markup: card > card__header (toggle, status,
 *  card__actions) + card__body (the always-visible slot, then the collapsible region). */
export function CollapsibleCard({ title, status, actions, always, children, open, defaultOpen = false, onOpenChange, headingLevel, compact = false }: CollapsibleCardProps) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const regionId = useId();
  const toggle = () => {
    if (open === undefined) setInner(!isOpen);
    onOpenChange?.(!isOpen);
  };
  const button = <button type="button" className="btn btn--ghost btn--sm" aria-expanded={isOpen} aria-controls={regionId} onClick={toggle}>
    <Icon name={isOpen ? "chevron-down" : "chevron-right"} />
    <span className="card__title">{title}</span>
  </button>;
  const Heading = headingLevel ? (`h${headingLevel}` as const) : null;

  return <section className={`card${compact ? " card--compact" : ""}`}>
    <div className="card__header">
      <div className="cluster cluster--sm">
        {Heading ? <Heading>{button}</Heading> : button}
        {status}
      </div>
      {actions ? <div className="card__actions">{actions}</div> : null}
    </div>
    <div className="card__body stack stack--sm" hidden={!isOpen && !always}>
      {always}
      <div id={regionId} hidden={!isOpen}>{children}</div>
    </div>
  </section>;
}
