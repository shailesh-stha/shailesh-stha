import { Icon, type IconName } from "../../design-system/react";
import type { Maturity } from "~/content/types";

const MATURITY: Record<Maturity, { label: string; tone: string; icon: IconName }> = {
  "feature-complete": { label: "Feature-complete", tone: " badge--success", icon: "circle-check" },
  // Neutral on purpose: the accent badge tone does not reach 4.5:1 text contrast (axe, both themes).
  "in-internal-use": { label: "In internal use", tone: "", icon: "users" },
  beta: { label: "Beta", tone: " badge--info", icon: "flask-conical" },
  exploratory: { label: "Exploratory", tone: " badge--warning", icon: "sparkles" },
  prototype: { label: "Prototype", tone: "", icon: "wrench" },
  "in-development": { label: "In development", tone: "", icon: "clock" },
};

/** Status is always icon plus text, never colour alone. `prefix` names the part a label belongs to. */
export function MaturityBadge({ maturity, prefix }: { maturity: Maturity; prefix?: string }) {
  const entry = MATURITY[maturity];
  return (
    <span className={`badge${entry.tone}`}>
      <Icon name={entry.icon} />
      {prefix ? `${prefix}: ${entry.label}` : entry.label}
    </span>
  );
}
