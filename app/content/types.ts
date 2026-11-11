export type Maturity =
  | "feature-complete"
  | "in-internal-use"
  | "beta"
  | "exploratory"
  | "prototype"
  | "in-development";

/** Only "approved" content may live in this public repo; `scripts/check-content.mjs` fails on anything else. */
export type Disclosure = "approved" | "pending";

export interface WorkPart {
  name: string;
  maturity: Maturity;
}

export interface WorkItem {
  id: string;
  name: string;
  oneLiner: string;
  summary: string;
  stack: string[];
  disclosure: Disclosure;
  maturity?: Maturity;
  parts?: WorkPart[];
}

export interface ExperienceItem {
  id: string;
  role: string;
  organization: string;
  location?: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  period: string;
  thesis?: string;
}

export interface CertItem {
  id: string;
  name: string;
  issuer: string;
  verifyUrl: string;
}

export interface SkillGroup {
  label: string;
  items: string[];
}
