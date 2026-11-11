import { Link } from "react-router";
import type { WorkItem } from "~/content/types";
import { MaturityBadge } from "./MaturityBadge";

export function WorkCard({ item }: { item: WorkItem }) {
  return (
    <article className="card">
      <div className="card__body stack stack--sm">
        <h3 className="card__title">{item.name}</h3>
        <p className="muted">{item.oneLiner}</p>
        <div className="cluster cluster--sm">
          {item.maturity ? <MaturityBadge maturity={item.maturity} /> : null}
          {item.parts?.map((part) => <MaturityBadge key={part.name} maturity={part.maturity} prefix={part.name} />)}
        </div>
        <div className="cluster cluster--sm">
          {item.stack.map((tech) => <span key={tech} className="badge badge--sm">{tech}</span>)}
        </div>
        <div>
          <Link className="btn btn--sm" to={`/work/${item.id}`}>
            View details
            <span className="sr-only"> of {item.name}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
