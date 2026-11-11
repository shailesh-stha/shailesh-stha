// One place for the name, the title and the short texts. Changing the title (for example when the company adopts it) is a one-line edit.
export const profile = {
  name: "Shailesh Shrestha",
  title: {
    en: "Technical Lead — AI & Digital Engineering",
    de: "Technischer Lead für KI und Digital Engineering",
  },
  location: "Stuttgart",
  siteTitle: "Shailesh Shrestha: AI and software tools for structural engineering",
  description:
    "Technical Lead for AI and digital engineering in Stuttgart. LLM and retrieval systems, Rhino and Grasshopper tools, and data pipelines for structural engineering.",
  headline: "AI and software tools for structural engineering",
  lead: "Civil engineer and geoinformatics specialist (M.Sc., HFT Stuttgart, 2023). I build LLM and retrieval systems, Rhino plugins and Grasshopper automation for structural engineers and architects.",
  about:
    "Civil engineer and geoinformatics specialist (M.Sc., HFT Stuttgart, 2023) building AI and software tools for structural engineering. I work on LLM and retrieval systems, Rhino plugins and Grasshopper automation, and prototype data pipelines that connect planning software to AI. Earlier, I worked on civil engineering design and coordination in Nepal and on PALM-4U microclimate data preparation.",
  // The only file where email addresses may appear (enforced by scripts/check-content.mjs).
  contact: {
    personalEmail: "shailesh.shrestha049@gmail.com",
    workEmail: "shrestha@str-ucture.com",
  },
  links: {
    github: "https://github.com/shailesh-stha",
    linkedin: "https://www.linkedin.com/in/shailesh-stha/",
  },
} as const;
