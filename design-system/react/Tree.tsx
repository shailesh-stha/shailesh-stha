import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { IconName } from "./icon-names";
import { Icon } from "./Icon";

export interface TreeNode {
  id: string;
  label: string;
  icon?: IconName;
  /** Child nodes. `undefined` with `hasChildren` marks a branch whose children load lazily. */
  children?: TreeNode[];
  /** True for a branch whose `children` are not loaded yet (shows the chevron; onExpand fires). */
  hasChildren?: boolean;
  disabled?: boolean;
}

export interface TreeProps {
  /** Accessible name of the tree. */
  label: string;
  nodes: TreeNode[];
  /** Selected node id (controlled). Omit for uncontrolled. */
  selected?: string;
  onSelect?: (id: string) => void;
  /** Expanded node ids (controlled). Omit for uncontrolled. */
  expanded?: string[];
  /** Called when a branch opens or closes. For a lazy branch (hasChildren without children) load the children now. */
  onExpandedChange?: (id: string, open: boolean) => void;
  /** Initially expanded ids when uncontrolled. */
  defaultExpanded?: string[];
  /** Ids of lazy branches that are loading. */
  busy?: string[];
  /** Optional per-node extra content, e.g. a badge. */
  renderExtra?: (node: TreeNode) => ReactNode;
}

interface Row { node: TreeNode; level: number; posinset: number; setsize: number; parent?: string }

/** Tree view with the WAI-ARIA keyboard model (Up/Down, Left/Right, Home/End, type-ahead, Enter, Space, *), same markup as js/behaviors/tree.js. */
export function Tree({ label, nodes, selected, onSelect, expanded, onExpandedChange, defaultExpanded = [], busy = [], renderExtra }: TreeProps) {
  const [innerSelected, setInnerSelected] = useState<string | undefined>(undefined);
  const [innerExpanded, setInnerExpanded] = useState<string[]>(defaultExpanded);
  const [active, setActive] = useState<string | undefined>(undefined);
  const refs = useRef(new Map<string, HTMLDivElement>());
  const typed = useRef({ text: "", timer: 0 });
  const open = expanded ?? innerExpanded;
  const current = selected ?? innerSelected;
  const isBranch = (node: TreeNode) => Boolean(node.children?.length || node.hasChildren);

  const visible: Row[] = [];
  const walk = (list: TreeNode[], level: number, parent?: string) => list.forEach((node, index) => {
    visible.push({ node, level, posinset: index + 1, setsize: list.length, parent });
    if (isBranch(node) && open.includes(node.id) && node.children) walk(node.children, level + 1, node.id);
  });
  walk(nodes, 1);
  const tabStop = visible.some(row => row.node.id === active) ? active : visible.some(row => row.node.id === current) ? current : visible[0]?.node.id;

  const setOpen = useCallback((node: TreeNode, next: boolean) => {
    if (!isBranch(node) || node.disabled || open.includes(node.id) === next) return;
    if (expanded === undefined) setInnerExpanded(next ? [...open, node.id] : open.filter(id => id !== node.id));
    onExpandedChange?.(node.id, next);
  }, [open, expanded, onExpandedChange]);
  const select = (node: TreeNode) => { if (node.disabled) return; if (selected === undefined) setInnerSelected(node.id); onSelect?.(node.id); };
  const focusRow = (id: string) => { setActive(id); refs.current.get(id)?.focus(); };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, row: Row) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const at = visible.findIndex(r => r.node.id === row.node.id);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    let key = event.key;
    if (rtl) key = key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key;
    const { node } = row;
    let target: string | undefined;
    if (key === "ArrowDown") target = visible[Math.min(at + 1, visible.length - 1)].node.id;
    else if (key === "ArrowUp") target = visible[Math.max(at - 1, 0)].node.id;
    else if (key === "Home") target = visible[0].node.id;
    else if (key === "End") target = visible[visible.length - 1].node.id;
    else if (key === "ArrowRight") {
      if (isBranch(node) && !open.includes(node.id)) { event.preventDefault(); setOpen(node, true); return; }
      if (isBranch(node) && node.children?.length) target = node.children[0].id; else { event.preventDefault(); return; }
    } else if (key === "ArrowLeft") {
      if (isBranch(node) && open.includes(node.id)) { event.preventDefault(); setOpen(node, false); return; }
      if (row.parent) target = row.parent; else { event.preventDefault(); return; }
    } else if (key === "Enter") { event.preventDefault(); select(node); if (isBranch(node)) setOpen(node, !open.includes(node.id)); return; }
    else if (key === " ") { event.preventDefault(); select(node); return; }
    else if (key === "*") { event.preventDefault(); visible.filter(r => r.setsize === row.setsize && r.level === row.level && r.parent === row.parent).forEach(r => setOpen(r.node, true)); return; }
    else if (key.length === 1 && /\S/.test(key)) {
      typed.current.text += key.toLowerCase();
      window.clearTimeout(typed.current.timer);
      typed.current.timer = window.setTimeout(() => { typed.current.text = ""; }, 500);
      const shift = at + (typed.current.text.length === 1 ? 1 : 0);
      target = [...visible.slice(shift), ...visible.slice(0, shift)].find(r => r.node.label.toLowerCase().startsWith(typed.current.text))?.node.id;
    }
    if (!target) return;
    event.preventDefault();
    focusRow(target);
  };

  const renderList = (list: TreeNode[], level: number, parent?: string): ReactNode => list.map((node, index) => {
    const branch = isBranch(node);
    const isOpen = branch && open.includes(node.id);
    const row: Row = { node, level, posinset: index + 1, setsize: list.length, parent };
    const style = { "--tree-depth": level - 1 } as CSSProperties;
    return <li role="none" key={node.id}>
      <div ref={element => { if (element) refs.current.set(node.id, element); else refs.current.delete(node.id); }} className="tree__item" role="treeitem" style={style}
        aria-level={level} aria-posinset={index + 1} aria-setsize={list.length} aria-expanded={branch ? isOpen : undefined} aria-selected={node.disabled ? undefined : current === node.id}
        aria-disabled={node.disabled || undefined} aria-busy={busy.includes(node.id) || undefined} tabIndex={tabStop === node.id ? 0 : -1}
        onFocus={event => { if (event.target === event.currentTarget) setActive(node.id); }} onKeyDown={event => { if (event.target === event.currentTarget) onKeyDown(event, row); }}
        onClick={() => { setActive(node.id); select(node); if (branch) setOpen(node, !isOpen); }}>
        {node.icon && <Icon name={node.icon} />}<span className="tree__label">{node.label}</span>{renderExtra?.(node)}
      </div>
      {branch && node.children && <ul className="tree__group" role="group">{renderList(node.children, level + 1, node.id)}</ul>}
    </li>;
  });

  return <ul className="tree" role="tree" aria-label={label}>{renderList(nodes, 1)}</ul>;
}
