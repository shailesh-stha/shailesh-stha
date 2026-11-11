export interface ThumbProps {
  src: string;
  /** Empty for a picture that the text next to it already describes. */
  alt: string;
  /** Frame shape: "wide" (16 / 9, default), "square" or "banner" (9 / 4). */
  ratio?: "wide" | "square" | "banner";
}

/** A picture cropped to fill its frame (`.thumb`). Loads lazily and decodes off the main thread. */
export function Thumb({ src, alt, ratio = "wide" }: ThumbProps) {
  return <span className={`thumb${ratio === "wide" ? "" : ` thumb--${ratio}`}`}><img src={src} alt={alt} loading="lazy" decoding="async" /></span>;
}
