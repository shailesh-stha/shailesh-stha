import { Icon } from "./Icon";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface CodeBlockProps {
  code: string;
  /** Shown in the header and read by screen readers, e.g. "TypeScript". */
  language?: string;
  /** Line numbers (CSS counter). */
  numbered?: boolean;
  /** 1-based line numbers to highlight. */
  highlight?: number[];
  /** Render one line's content, e.g. wrap tokens from your highlighter in <span data-token="keyword">. Default: plain text. */
  renderLine?: (line: string, index: number) => ReactNode;
  /** aria-label of the copy button (default "Copy code"). */
  copyLabel?: string;
  /** Hide the header (and the copy button). */
  bare?: boolean;
  /** Wrap long lines instead of scrolling sideways (code-block--wrap). */
  wrap?: boolean;
}

async function writeClipboard(text: string): Promise<"clipboard" | "execCommand" | "failed"> {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return "clipboard"; } } catch { /* fall through */ }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.className = "sr-only";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  area.remove();
  return ok ? "execCommand" : "failed";
}

/** A code block with a copy button. Same markup and behaviour as the plain-HTML .code-block + copy.js: announces "Copied" politely, falls back to selecting the text. */
export function CodeBlock({ code, language = "", numbered = false, highlight = [], renderLine, copyLabel = "Copy code", bare = false, wrap = false }: CodeBlockProps) {
  const [message, setMessage] = useState("");
  const body = useRef<HTMLPreElement>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const lines = code.replace(/\n$/, "").split("\n");

  const copy = async () => {
    const result = await writeClipboard(lines.join("\n"));
    if (result === "failed" && body.current) {
      const range = document.createRange();
      range.selectNodeContents(body.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      setMessage("Selected. Press Ctrl+C to copy.");
    } else setMessage("Copied");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(""), 2000);
  };

  return <div className={`code-block${numbered ? " code-block--numbered" : ""}${wrap ? " code-block--wrap" : ""}`}>
    {!bare && <div className="code-block__header">
      <span className="code-block__lang">{language}</span>
      <div className="code-block__actions">
        <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label={copyLabel} onClick={copy}><Icon name={message === "Copied" ? "check" : "copy"} /></button>
        <span className="sr-only" role="status" aria-live="polite">{message}</span>
      </div>
    </div>}
    <pre className="code-block__body" tabIndex={0} ref={body}><code>{lines.map((line, index) =>
      <span className="code-block__line" key={index} data-highlight={highlight.includes(index + 1) ? "" : undefined}>{renderLine ? renderLine(line, index) : line}{"\n"}</span>)}</code></pre>
  </div>;
}
