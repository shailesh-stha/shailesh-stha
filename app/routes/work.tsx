import { data, Link } from "react-router";
import type { Route } from "./+types/work";
import { MaturityBadge } from "~/components/MaturityBadge";
import { profile } from "~/content/profile";
import { work } from "~/content/work";

export function loader({ params }: Route.LoaderArgs) {
  const item = work.find((entry) => entry.id === params.id);
  if (!item) throw data("Not found", { status: 404 });
  return { item };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const item = loaderData?.item;
  return [
    { title: item ? `${item.name} | ${profile.name}` : profile.siteTitle },
    { name: "description", content: item?.oneLiner ?? profile.description },
  ];
}

export default function WorkDetail({ loaderData }: Route.ComponentProps) {
  const { item } = loaderData;
  return (
    <div className="page-section">
      <div className="center center--prose stack">
        <Link className="link link--muted" to="/#work">All work</Link>
        <header className="page-header">
          <h1 className="text-title">{item.name}</h1>
        </header>
        <p className="lead">{item.oneLiner}</p>
        <div className="cluster cluster--sm">
          {item.maturity ? <MaturityBadge maturity={item.maturity} /> : null}
          {item.parts?.map((part) => <MaturityBadge key={part.name} maturity={part.maturity} prefix={part.name} />)}
        </div>
        <div className="prose">
          <p>{item.summary}</p>
        </div>
        <dl className="kv kv--inline">
          <dt className="kv__term">Stack</dt>
          <dd className="kv__desc">{item.stack.join(", ")}</dd>
        </dl>
      </div>
    </div>
  );
}
