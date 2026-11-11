import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import themeScript from "../design-system/theme.js?raw";
import "../design-system/design.css";
import "../design-system/icons.css";
import "./app.css";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteHeader } from "~/components/SiteHeader";
import { profile } from "~/content/profile";

// Brand accent: a mid-saturation mint green. theme.js derives the readable text and fill tokens for the current theme.
const ACCENT = "#3DBE8B";
// theme.js mentions "</script>" in a comment, which would end an inline script early, so escape it.
const bootScript = `${themeScript.replace(/<\/script/gi, "<\\/script")}\n;try{window.designTheme.setAccentColor("${ACCENT}")}catch(e){}`;

export const links: Route.LinksFunction = () => [{ rel: "icon", href: `${import.meta.env.BASE_URL}favicon.svg`, type: "image/svg+xml" }];

export const meta: Route.MetaFunction = () => [
  { title: profile.siteTitle },
  { name: "description", content: profile.description },
  { property: "og:type", content: "website" },
  { property: "og:title", content: profile.siteTitle },
  { property: "og:description", content: profile.description },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader />
      <main id="main" className="app-gutter">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const title = notFound ? "Page not found" : "Something went wrong";
  const text = notFound ? "This page does not exist. Try the home page." : "Please try again in a moment.";
  return (
    <>
      <title>{`${title} | ${profile.name}`}</title>
      <meta name="robots" content="noindex" />
      <SiteHeader />
      <main id="main" className="app-gutter">
        <section className="page-section">
          <div className="empty empty--error">
            <h1 className="empty__title">{title}</h1>
            <p className="empty__text">{text}</p>
            <Link className="btn" to="/">Go to home</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
