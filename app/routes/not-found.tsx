import { data } from "react-router";

// Catch-all: unknown paths raise a 404, which the root ErrorBoundary renders.
export function loader() {
  throw data("Not found", { status: 404 });
}

export default function NotFound() {
  return null;
}
