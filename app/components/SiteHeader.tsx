import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { Icon, ThemeToggle } from "../../design-system/react";
import { profile } from "~/content/profile";
import { ClientOnly } from "./ClientOnly";
import { HashLink } from "./HashLink";

const LINKS = [
  { to: "/#work", label: "Work" },
  { to: "/#experience", label: "Experience" },
  { to: "/#education", label: "Education" },
  { to: "/#certifications", label: "Certifications" },
  { to: "/cv", label: "CV" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  // The phone menu closes on Escape and hands focus back to its button (the system's script only does this on plain pages).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="navbar navbar--sticky navbar--contained">
      <Link className="navbar__brand" to="/">{profile.name}</Link>
      <button
        ref={toggleRef}
        type="button"
        className="btn btn--ghost btn--icon navbar__toggle"
        aria-expanded={open}
        aria-controls="site-nav"
        aria-label="Menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="menu" />
      </button>
      <nav className="navbar__links" id="site-nav" aria-label="Main" onClick={() => setOpen(false)}>
        {LINKS.map((link) => (
          <HashLink key={link.to} className="navbar__link" to={link.to} aria-current={link.to === pathname ? "page" : undefined}>
            {link.label}
          </HashLink>
        ))}
      </nav>
      <div className="navbar__actions">
        <HashLink className="btn" to="/#contact" onClick={() => setOpen(false)}>Contact</HashLink>
        <ClientOnly fallback={<span className="btn btn--ghost btn--icon" aria-hidden="true" />}>
          <ThemeToggle />
        </ClientOnly>
      </div>
    </header>
  );
}
