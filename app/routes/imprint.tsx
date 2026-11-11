import type { Route } from "./+types/imprint";
import { legal } from "~/content/legal";
import { profile } from "~/content/profile";

export function meta({}: Route.MetaArgs) {
  return [{ title: `Imprint | ${profile.name}` }, { name: "robots", content: "noindex" }];
}

export default function Imprint() {
  return (
    <section className="page-section">
      <div className="center center--prose stack">
        <header className="page-header">
          <h1 className="text-title">Imprint</h1>
        </header>
        <div className="prose">
          <p>
            {legal.imprint.name}
            <br />
            {legal.imprint.address}
          </p>
          <p>Email: {legal.imprint.email}</p>
          <p>Phone: {legal.imprint.phone}</p>
        </div>
      </div>
    </section>
  );
}
