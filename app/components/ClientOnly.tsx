import { useEffect, useState, type ReactNode } from "react";

/** Renders `children` only in the browser. Needed for pieces that read `window` while rendering (the theme menu). */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? children : fallback}</>;
}
