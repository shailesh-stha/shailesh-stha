import { work } from "./work";

/** Paths rendered to static HTML at build time. Used by react-router.config.ts. */
export function prerenderPaths(): string[] {
  return ["/", "/cv", "/imprint", "/privacy", ...work.map((item) => `/work/${item.id}`)];
}
