import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export interface CarouselItem {
  /** Stable key. */
  id: string;
  /** Short name of the slide; the dot is labelled "Go to <label>". */
  label: string;
  /** The slide content, usually a card. */
  content: ReactNode;
}

export interface CarouselProps {
  /** Accessible name of the carousel, e.g. "STR-AI add-ins". */
  label: string;
  items: CarouselItem[];
  /** Autoplay delay in milliseconds. Omit (or 0) for no autoplay; it never runs under prefers-reduced-motion. A pause button appears whenever it is on. */
  autoplay?: number;
  /** Previous/next wrap around at the ends. */
  loop?: boolean;
  /** Cards per view: 1 or 3 limits or raises the automatic 1, then 2 from 40rem of container width. */
  perView?: 1 | 3;
  /** Called when the active position changes. */
  onChange?: (index: number) => void;
  previousLabel?: string;
  nextLabel?: string;
  pauseLabel?: string;
  resumeLabel?: string;
  /** Accessible name of the group of dots. */
  dotsLabel?: string;
  /** Name of one dot (default "Go to <label>"). */
  dotLabel?: (item: CarouselItem, index: number) => string;
  /** The counter text (default "2 of 4"). */
  countLabel?: (current: number, total: number) => string;
  /** The accessible name of a slide (default "2 of 4"). */
  slideLabel?: (current: number, total: number) => string;
  /** aria-roledescription of the carousel and of a slide (translate both). */
  roleDescription?: string;
  slideRoleDescription?: string;
  className?: string;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
const ofTotal = (current: number, total: number) => `${current} of ${total}`;
/** How long a slide change takes: `--carousel-duration` on the carousel (default `--duration-slider`, 500 ms), read as ms or s. */
const slideMs = (root: HTMLElement | null) => {
  const value = root ? getComputedStyle(root).getPropertyValue("--carousel-duration").trim() : "";
  const number = parseFloat(value);
  if (!Number.isFinite(number)) return 500;
  return value.endsWith("ms") ? number : value.endsWith("s") ? number * 1000 : number;
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** A scroll-snap strip of cards with previous/next, dots, a counter and opt-in autoplay; same markup and behaviour as js/behaviors/carousel.js (W3C APG carousel pattern). */
export function Carousel({
  label, items, autoplay = 0, loop = false, perView, onChange,
  previousLabel = "Previous", nextLabel = "Next", pauseLabel = "Pause rotation", resumeLabel = "Resume rotation", dotsLabel = "Choose a slide",
  dotLabel = (item) => `Go to ${item.label}`, countLabel = ofTotal, slideLabel = ofTotal,
  roleDescription = "carousel", slideRoleDescription = "slide", className = "",
}: CarouselProps) {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = useState(0);
  const [last, setLast] = useState(Math.max(0, items.length - 1));
  const [fits, setFits] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [hover, setHover] = useState(false);
  const [inside, setInside] = useState(false);
  const [ignoreFocus, setIgnoreFocus] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const delay = reduced() ? 0 : autoplay;
  const playing = delay > 0 && !fits && !stopped && !hover && !(inside && !ignoreFocus) && !hidden && onScreen;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const previous = useRef(0);

  const offset = (index: number) => slideRefs.current[index]?.offsetLeft ?? 0;
  const animation = useRef(0);
  // Stop a running slide animation and hand scrolling back to the browser (snap and smooth scroll on again).
  const settle = () => {
    cancelAnimationFrame(animation.current);
    animation.current = 0;
    const track = trackRef.current;
    if (track) { track.style.scrollSnapType = ""; track.style.scrollBehavior = ""; }
  };
  // The browser's own smooth scroll cannot be given a duration, so a slide change is animated here (eased, `--carousel-duration`).
  const scrollToIndex = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    settle();
    const target = offset(index);
    const from = track.scrollLeft;
    const distance = target - from;
    if (reduced() || Math.abs(distance) < 1) { track.scrollTo({ left: target, behavior: "auto" }); return; }
    const ms = slideMs(rootRef.current);
    const start = performance.now();
    track.style.scrollSnapType = "none";
    track.style.scrollBehavior = "auto";
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      track.scrollLeft = from + distance * easeInOut(t);
      if (t < 1) animation.current = requestAnimationFrame(step); else settle();
    };
    animation.current = requestAnimationFrame(step);
  };
  const interrupt = () => { settle(); stop(); };
  const stop = () => { if (delay > 0) setStopped(true); };
  const go = (index: number) => {
    stop();
    scrollToIndex(loop ? (index + last + 1) % (last + 1) : Math.max(0, Math.min(last, index)));
  };

  useEffect(() => () => cancelAnimationFrame(animation.current), []);

  // Follow the scroll position: the last reachable position, the active one, and whether everything fits.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const max = track.scrollWidth - track.clientWidth;
      const noScroll = max <= 1;
      let lastIndex = items.length - 1;
      for (let i = 0; i < items.length; i += 1) if (offset(i) >= max - 1) { lastIndex = i; break; }
      if (noScroll) lastIndex = 0;
      let best = 0, distance = Infinity;
      if (!noScroll) for (let i = 0; i <= lastIndex; i += 1) { const d = Math.abs(offset(i) - track.scrollLeft); if (d < distance) { distance = d; best = i; } }
      setFits(noScroll);
      setLast(lastIndex);
      setActive(best);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    track.addEventListener("scroll", schedule, { passive: true });
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    resize?.observe(track);
    return () => { if (frame) cancelAnimationFrame(frame); track.removeEventListener("scroll", schedule); resize?.disconnect(); };
  }, [items.length]);

  useEffect(() => {
    if (previous.current !== active) { previous.current = active; onChangeRef.current?.(active); }
  }, [active]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    const root = rootRef.current;
    const seen = delay > 0 && root && typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(entries => setOnScreen(entries[entries.length - 1].isIntersecting)) : null;
    if (root) seen?.observe(root);
    return () => { document.removeEventListener("visibilitychange", onVisibility); seen?.disconnect(); };
  }, [delay]);

  // Autoplay: one timer per position; it restarts whenever the active slide, or whether it may run, changes.
  useEffect(() => {
    rootRef.current?.style.setProperty("--carousel-delay", `${delay}ms`);
    if (!playing) return undefined;
    const timer = window.setTimeout(() => scrollToIndex(active >= last ? 0 : active + 1), delay);
    return () => window.clearTimeout(timer);
  }, [playing, active, last, delay]);

  const atStart = !loop && active <= 0;
  const atEnd = !loop && active >= last;
  const stopOnKey = (event: { key: string }) => { if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") stop(); };

  return (
    <section
      ref={rootRef}
      className={`carousel${className ? ` ${className}` : ""}`}
      aria-roledescription={roleDescription}
      aria-label={label}
      data-per-view={perView}
      data-fits={fits ? "" : undefined}
      data-playing={playing ? "" : undefined}
      onPointerEnter={event => { if (event.pointerType === "mouse") setHover(true); }}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setInside(true)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setInside(false); setIgnoreFocus(false); } }}
    >
      <div className="carousel__controls">
        {delay > 0 && (
          <button type="button" className="btn btn--ghost btn--sm carousel__pause" aria-label={stopped ? resumeLabel : pauseLabel} aria-pressed={stopped} onClick={() => { setStopped(value => !value); setIgnoreFocus(stopped); }}>
            <Icon name={stopped ? "play" : "pause"} />
          </button>
        )}
        <span className="carousel__count">{countLabel(Math.min(active, last) + 1, last + 1)}</span>
        <button type="button" className="btn btn--ghost btn--sm carousel__prev" aria-label={previousLabel} aria-disabled={atStart || undefined} onClick={() => { if (!atStart) go(active - 1); }}>
          <Icon name="chevron-left" />
        </button>
        <button type="button" className="btn btn--ghost btn--sm carousel__next" aria-label={nextLabel} aria-disabled={atEnd || undefined} onClick={() => { if (!atEnd) go(active + 1); }}>
          <Icon name="chevron-right" />
        </button>
      </div>
      <div
        ref={trackRef}
        className="carousel__track"
        tabIndex={0}
        aria-live={playing ? "off" : "polite"}
        onPointerDown={interrupt}
        onWheel={interrupt}
        onTouchStart={interrupt}
        onKeyDown={stopOnKey}
      >
        {items.map((item, index) => (
          <div key={item.id} ref={node => { slideRefs.current[index] = node; }} className="carousel__slide" role="group" aria-roledescription={slideRoleDescription} aria-label={slideLabel(index + 1, items.length)}>
            {item.content}
          </div>
        ))}
      </div>
      <div className="carousel__dots" role="group" aria-label={dotsLabel}>
        {items.map((item, index) => (
          <button key={item.id} type="button" className="carousel__dot" hidden={index > last} aria-label={dotLabel(item, index)} aria-current={index === active ? "true" : undefined} onClick={() => go(index)} />
        ))}
      </div>
    </section>
  );
}
