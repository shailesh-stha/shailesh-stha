import type { WorkItem } from "./types";

// Approved items only. Pending items (and anything naming a client or partner) live outside this repo, in _profile/website-content-pending.md.
export const work: WorkItem[] = [
  {
    id: "str-ai",
    name: "STR-AI",
    oneLiner: "AI workspace for LLM chat, document retrieval (RAG) and structural-document workflows.",
    summary:
      "An AI workspace with multi-provider chat, retrieval, structural-document workflows and Office and Rhino add-ins. Used by engineers and architects at str.ucture.",
    stack: ["React", "Node.js", "Supabase", "LLM APIs", "RAG"],
    disclosure: "approved",
    maturity: "in-internal-use",
  },
  {
    id: "strtoolkit",
    name: "StrToolkit",
    oneLiner: "Rhino 8 plugin for structural engineering productivity.",
    summary:
      "A Rhino 8 plugin that bundles tools for structural engineers. The steel-profile generator is feature-complete, system-line generation is exploratory and Make2D drafting is in beta.",
    stack: ["Rhino 8", "C#", ".NET", "RhinoCommon"],
    disclosure: "approved",
    parts: [
      { name: "Steel-profile generator", maturity: "feature-complete" },
      { name: "System lines", maturity: "exploratory" },
      { name: "Make2D drafting", maturity: "beta" },
    ],
  },
  {
    id: "palm-voxel",
    name: "PALM Voxel",
    oneLiner: "Browser tool to view PALM drivers and output in 3D and build projects from open map data.",
    summary:
      "Continues my PALM-4U thesis work. A local React and Node tool to view PALM static drivers as 3D voxels, view PALM output and build a project from open map data. Final real-run tests are pending and editing drivers in 3D is not built yet.",
    stack: ["React 19", "Node.js", "PALM-4U", "WSL"],
    disclosure: "approved",
    maturity: "in-development",
  },
];
