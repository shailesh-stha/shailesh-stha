import { useState, type ReactNode } from "react";

export interface SegmentedItem {
  /** Stable value reported to onChange. */
  value: string;
  label: ReactNode;
  /** Optional count shown after the label (e.g. unread items). */
  count?: number | string;
  disabled?: boolean;
}

export interface SegmentedProps {
  /** Accessible name of the group, e.g. "View". */
  label: string;
  items: SegmentedItem[];
  /** Pick-one: the chosen value. Omit to let the component keep its own. */
  value?: string;
  /** Initial value when uncontrolled (default: the first enabled item). */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Items toggle independently (a set of filters). Then `values` / `defaultValues` / `onChangeValues` apply instead. */
  multiple?: boolean;
  values?: string[];
  defaultValues?: string[];
  onChangeValues?: (values: string[]) => void;
}

/** Segmented control: pick one of a few values inline (or, with `multiple`, a set). Same markup and behaviour as js/behaviors/segmented.js:
 *  .segmented[role=group] > button.segmented__item[aria-pressed]. Every item is a real button, so no roving focus. */
export function Segmented({ label, items, value, defaultValue, onChange, multiple = false, values, defaultValues = [], onChangeValues }: SegmentedProps) {
  const [one, setOne] = useState(defaultValue ?? items.find(item => !item.disabled)?.value);
  const [many, setMany] = useState(defaultValues);
  const chosen = value ?? one;
  const chosenSet = values ?? many;

  const press = (item: SegmentedItem) => {
    if (item.disabled) return;
    if (multiple) {
      const next = chosenSet.includes(item.value) ? chosenSet.filter(v => v !== item.value) : [...chosenSet, item.value];
      if (values === undefined) setMany(next);
      onChangeValues?.(next);
    } else if (item.value !== chosen) {
      if (value === undefined) setOne(item.value);
      onChange?.(item.value);
    }
  };

  return <div className="segmented" role="group" aria-label={label}>
    {items.map(item => <button
      key={item.value}
      type="button"
      className="segmented__item"
      aria-pressed={multiple ? chosenSet.includes(item.value) : item.value === chosen}
      disabled={item.disabled}
      onClick={() => press(item)}
    >{item.label}{item.count !== undefined && <span className="segmented__count">{item.count}</span>}</button>)}
  </div>;
}
