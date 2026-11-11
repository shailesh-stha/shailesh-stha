import type { Route } from "./+types/privacy";
import { legal } from "~/content/legal";
import { profile } from "~/content/profile";

export function meta({}: Route.MetaArgs) {
  return [{ title: `Privacy | ${profile.name}` }, { name: "robots", content: "noindex" }];
}

export default function Privacy() {
  return (
    <section className="page-section">
      <div className="center center--prose stack">
        <header className="page-header">
          <h1 className="text-title">Privacy</h1>
        </header>
        <div className="prose">
          <h2>Controller</h2>
          <p>{legal.privacy.controller}</p>
          <h2>What this site does</h2>
          <p>
            The site sets no cookies and loads no third-party scripts, fonts or analytics. Your choice of light or dark theme is kept in your browser's local storage
            and never sent to a server.
          </p>
          <h2>Hosting</h2>
          <p>{legal.privacy.hosting}</p>
        </div>
      </div>
    </section>
  );
}
