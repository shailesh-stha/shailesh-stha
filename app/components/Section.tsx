import type { ReactNode } from "react";

export function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="app-section" id={id} aria-labelledby={`${id}-title`}>
      <div className="center app-wide stack stack--lg">
        <div className="stack stack--sm app-measure">
          <h2 className="text-title" id={`${id}-title`}>{title}</h2>
          {lead ? <p className="lead">{lead}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
