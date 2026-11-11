import type { ComponentProps, MouseEvent } from "react";
import { Link, useHref, useLocation } from "react-router";

type HashLinkProps = Omit<ComponentProps<typeof Link>, "to"> & { to: string };

/**
 * A router link that scrolls smoothly when its target is a section on the current page ("/#work" while on "/").
 * Links to other pages, modified clicks and a reduced-motion preference fall back to the router's normal behaviour.
 * Project CSS cannot set `scroll-behavior`, so the animation is done here.
 */
export function HashLink({ to, onClick, ...props }: HashLinkProps) {
  const { pathname } = useLocation();
  const href = useHref(to); // includes the site's base path, which a bare "/#work" does not

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const [path, hash] = to.split("#");
    if (!hash || (path || "/") !== pathname) return;
    const target = document.getElementById(hash);
    if (!target) return;

    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Put the hash in the URL without a router navigation (the router would scroll instantly), then animate the scroll ourselves.
    window.history.replaceState(window.history.state, "", href);
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    // Keyboard and screen-reader users land in the section too.
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };

  return <Link to={to} onClick={handleClick} {...props} />;
}
