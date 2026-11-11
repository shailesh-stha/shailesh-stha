import { useRef, type InputHTMLAttributes, type Ref } from "react";

export interface SearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className" | "placeholder"> {
  /** Required: the clear button is hidden by CSS while the placeholder shows, so the field needs one. */
  placeholder: string;
  /** Called by the clear button. A controlled input cannot be emptied by the browser, so set your value to "" here. */
  onClear: () => void;
  /** Accessible name of the clear button. Default "Clear search". */
  clearLabel?: string;
  /** Sets aria-busy on the wrapper: the clear button gives way to a spinner while results load. */
  busy?: boolean;
  /** Extra classes for the wrapper, for width or flex layout only. */
  className?: string;
  /** Extra classes for the input. */
  inputClassName?: string;
  /** Ref to the input element. */
  inputRef?: Ref<HTMLInputElement>;
}

const assign = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
};

/** The search component: icon, input and clear button. Takes every native input prop. Without an aria-label or aria-labelledby the placeholder names the field. */
export function Search({ onClear, clearLabel = "Clear search", busy = false, className, inputClassName, inputRef, placeholder, ...inputProps }: SearchProps) {
  const own = useRef<HTMLInputElement | null>(null);
  const setInput = (node: HTMLInputElement | null) => { own.current = node; assign(inputRef, node); };
  const named = inputProps["aria-label"] !== undefined || inputProps["aria-labelledby"] !== undefined;
  return (
    <div className={className ? `search ${className}` : "search"} aria-busy={busy || undefined}>
      <span className="icon icon--search search__icon" aria-hidden="true" />
      <input
        {...inputProps}
        ref={setInput}
        type="search"
        className={inputClassName ? `input search__input ${inputClassName}` : "input search__input"}
        placeholder={placeholder}
        aria-label={named ? inputProps["aria-label"] : placeholder}
      />
      <button type="button" className="search__clear" aria-label={clearLabel} onClick={() => { onClear(); own.current?.focus(); }}>
        <span className="icon icon--x" aria-hidden="true" />
      </button>
    </div>
  );
}
