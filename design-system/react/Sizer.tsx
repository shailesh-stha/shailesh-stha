import type { ReactNode } from "react";

export interface SizerProps {
  /** The widest text this value can take, e.g. "500 / 500". It is rendered invisibly to reserve the width. */
  widest: ReactNode;
  /** Align the visible value to the end of the box. */
  end?: boolean;
  children: ReactNode;
}

/** A box as wide as the widest value it can take, so a live number never moves what is beside it. */
export function Sizer({ widest, end = false, children }: SizerProps) {
  return <span className={`sizer${end ? " sizer--end" : ""}`}><span>{children}</span><span aria-hidden="true">{widest}</span></span>;
}
