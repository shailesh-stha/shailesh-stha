import type { EducationItem, ExperienceItem } from "~/content/types";

export function ExperienceList({ items }: { items: ExperienceItem[] }) {
  return (
    <ul className="list">
      {items.map((item) => (
        <li key={item.id} className="list__item">
          <div className="list__main app-entry">
            <span className="list__title">{item.role}, {item.organization}</span>
            <span className="list__meta">
              {item.start} – {item.end}
              {item.location ? ` · ${item.location}` : ""}
            </span>
            {item.bullets.length > 0 ? (
              <div className="prose text-body text-body--sm">
                <ul>
                  {item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EducationList({ items }: { items: EducationItem[] }) {
  return (
    <ul className="list">
      {items.map((item) => (
        <li key={item.id} className="list__item">
          <div className="list__main app-entry">
            <span className="list__title">{item.degree}</span>
            <span className="list__meta">{item.institution} · {item.period}</span>
            {item.thesis ? <span className="list__meta">Thesis: {item.thesis}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
