import { useEffect, useRef } from "react";

// Decorative network behind the hero. Topology is fixed, only positions drift, so a frame costs one pass over ~50 edges.
// Colours are read from the design tokens at run time; the canvas is hidden from assistive technology.
const LABELS = ["LLM", "RAG", "MCP", "STR-AI", "Rhino", "Grasshopper", "Python", "C#"];
const NODE_COUNT = 34;
const TWO_PI = Math.PI * 2;

interface GraphNode {
  x: number;
  y: number;
  ax: number;
  ay: number;
  phase: number;
  speed: number;
  radius: number;
  label?: string;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildNodes(): GraphNode[] {
  const rand = mulberry32(20261111);
  return Array.from({ length: NODE_COUNT }, (_, i) => {
    const labelled = i < LABELS.length;
    // Labelled nodes sit in the right half so the left-aligned hero text stays readable.
    const x = labelled ? 0.58 + rand() * 0.36 : rand();
    const y = labelled ? 0.12 + (i / LABELS.length) * 0.76 + rand() * 0.04 : rand();
    return {
      x,
      y,
      ax: 0.006 + rand() * 0.012,
      ay: 0.008 + rand() * 0.014,
      phase: rand() * TWO_PI,
      speed: 0.15 + rand() * 0.25,
      radius: labelled ? 3.5 : 2,
      label: labelled ? LABELS[i] : undefined,
    };
  });
}

function readColors() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return { accent: token("--accent", "gray"), muted: token("--text-muted", "gray"), font: style.fontFamily };
}

export function HeroGraph() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const nodes = buildNodes();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let edges: [number, number][] = [];
    let colors = readColors();
    let width = 0;
    let height = 0;
    let visible = true;
    let frame = 0;

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Link every node to its two nearest neighbours (measured in pixels so the shape follows the aspect ratio).
      const seen = new Set<string>();
      edges = [];
      nodes.forEach((a, i) => {
        nodes
          .map((b, j) => ({ j, d: (a.x - b.x) ** 2 * width * width + (a.y - b.y) ** 2 * height * height }))
          .filter((n) => n.j !== i)
          .sort((p, q) => p.d - q.d)
          .slice(0, 2)
          .forEach(({ j }) => {
            const key = i < j ? `${i}-${j}` : `${j}-${i}`;
            if (!seen.has(key)) {
              seen.add(key);
              edges.push([i, j]);
            }
          });
      });
    };

    const draw = (seconds: number) => {
      ctx.clearRect(0, 0, width, height);
      const points = nodes.map((n) => ({
        x: (n.x + Math.sin(seconds * n.speed + n.phase) * n.ax) * width,
        y: (n.y + Math.cos(seconds * n.speed * 0.9 + n.phase) * n.ay) * height,
      }));
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.muted;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      for (const [a, b] of edges) {
        ctx.moveTo(points[a].x, points[a].y);
        ctx.lineTo(points[b].x, points[b].y);
      }
      ctx.stroke();
      nodes.forEach((n, i) => {
        ctx.globalAlpha = n.label ? 0.9 : 0.45;
        ctx.fillStyle = n.label ? colors.accent : colors.muted;
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, n.radius, 0, TWO_PI);
        ctx.fill();
      });
      if (width >= 640) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = colors.muted;
        ctx.font = `12px ${colors.font}`;
        nodes.forEach((n, i) => {
          if (n.label) ctx.fillText(n.label, points[i].x + 9, points[i].y + 4);
        });
      }
      ctx.globalAlpha = 1;
    };

    const tick = (ms: number) => {
      draw(ms / 1000);
      frame = visible && !reduceMotion.matches && !document.hidden ? requestAnimationFrame(tick) : 0;
    };
    const start = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (reduceMotion.matches || !visible || document.hidden) draw(0);
      else frame = requestAnimationFrame(tick);
    };

    const onTheme = () => {
      colors = readColors();
      start();
    };
    const resize = new ResizeObserver(() => {
      layout();
      start();
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });

    layout();
    start();
    resize.observe(canvas);
    observer.observe(canvas);
    document.addEventListener("design:theme", onTheme);
    document.addEventListener("visibilitychange", start);
    reduceMotion.addEventListener("change", start);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("design:theme", onTheme);
      document.removeEventListener("visibilitychange", start);
      reduceMotion.removeEventListener("change", start);
    };
  }, []);

  return <canvas ref={ref} className="app-hero__canvas" aria-hidden="true" />;
}
