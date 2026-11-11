import { useId, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export type FileRejection = { file: File; reason: "type" | "size" | "count" };
export interface FileStatus { text?: string; state?: "busy" | "done" | "error"; /** 0 to 100 shows a progress bar. */ value?: number }

export interface DropzoneProps {
  /** The files currently chosen (you own the list; upload them yourself). */
  files: File[];
  onFilesChange: (files: File[]) => void;
  /** Same syntax as <input accept>: ".pdf,image/*". */
  accept?: string;
  multiple?: boolean;
  /** Bytes per file. */
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  /** An upload is running: no new files are taken. */
  busy?: boolean;
  /** Visible instruction, e.g. "Choose files or drop them here". It is the accessible name of the file input. */
  label: ReactNode;
  /** Constraints text, e.g. "PDF, up to 5 MB". Read after the name. */
  hint?: ReactNode;
  onReject?: (rejections: FileRejection[]) => void;
  /** Per-file status by file name: text, state and progress. */
  statuses?: Record<string, FileStatus>;
  removeLabel?: (name: string) => string;
  id?: string;
  name?: string;
}

const sizeText = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 102.4) / 10} KB` : `${Math.round(bytes / 104857.6) / 10} MB`;

/** Drag-and-drop area over a real file input (click, Enter and Space are native), with the chosen files listed underneath. */
export function Dropzone({ files, onFilesChange, accept, multiple = false, maxSize, maxFiles, disabled, busy, label, hint, onReject, statuses = {}, removeLabel = n => `Remove ${n}`, id, name }: DropzoneProps) {
  const base = useId();
  const inputId = id ?? `${base}-input`;
  const [over, setOver] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [message, setMessage] = useState("");
  const accepts = (accept ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const typeOk = (f: File) => !accepts.length || accepts.some(a => a.startsWith(".") ? f.name.toLowerCase().endsWith(a) : a.endsWith("/*") ? f.type.toLowerCase().startsWith(a.slice(0, -1)) : f.type.toLowerCase() === a);
  const limit = maxFiles ?? (multiple ? 0 : 1);

  const take = (incoming: File[]) => {
    const rejected: FileRejection[] = [];
    let next = multiple ? files.slice() : [];
    let added = 0;
    for (const file of incoming) {
      if (next.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) continue;
      if (!typeOk(file)) rejected.push({ file, reason: "type" });
      else if (maxSize && file.size > maxSize) rejected.push({ file, reason: "size" });
      else if (limit && next.length >= limit) rejected.push({ file, reason: "count" });
      else { next = [...next, file]; added += 1; }
    }
    setInvalid(rejected.length > 0);
    if (rejected.length) { onReject?.(rejected); setMessage(`${rejected.length} files were not added`); } else if (added) setMessage(`${added} files added`);
    if (added) onFilesChange(next);
  };
  const hasFiles = (event: React.DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");

  return <>
    <div className="dropzone" data-dragover={over ? "" : undefined} aria-invalid={invalid || undefined} aria-busy={busy || undefined} aria-disabled={disabled || undefined}
      onDragEnter={event => { if (hasFiles(event) && !disabled) { event.preventDefault(); setOver(true); } }}
      onDragOver={event => { if (hasFiles(event) && !disabled) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setOver(true); } }}
      onDragLeave={event => { if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget as Node)) setOver(false); }}
      onDrop={event => { if (!hasFiles(event)) return; event.preventDefault(); setOver(false); if (!disabled && !busy) take(Array.from(event.dataTransfer.files)); }}>
      <input id={inputId} name={name} className="dropzone__input" type="file" accept={accept} multiple={multiple} disabled={disabled} aria-invalid={invalid || undefined} aria-describedby={hint ? `${base}-hint` : undefined}
        onClick={event => { if (busy) event.preventDefault(); }}
        onChange={event => { take(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      <label className="dropzone__label" htmlFor={inputId}><Icon name="upload" />{label}</label>
      {hint && <span className="field__hint" id={`${base}-hint`}>{hint}</span>}
      <span className="sr-only" role="status" aria-live="polite">{message}</span>
    </div>
    {files.length > 0 && <ul className="file-list" role="list">
      {files.map(file => {
        const s = statuses[file.name] ?? {};
        return <li key={`${file.name}-${file.size}-${file.lastModified}`} className="file-list__item" data-state={s.state}>
          <Icon name="file" />
          <span className="file-list__name">{file.name}</span>
          <span className="file-list__status">{s.text ?? sizeText(file.size)}</span>
          <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label={removeLabel(file.name)} onClick={() => { onFilesChange(files.filter(f => f !== file)); setInvalid(false); setMessage(`${file.name} removed`); }}><Icon name="x" /></button>
          {s.value != null && <progress className="progress progress--sm" max={100} value={s.value} aria-label={file.name} />}
        </li>;
      })}
    </ul>}
  </>;
}
