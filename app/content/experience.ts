import type { ExperienceItem } from "./types";

export const experience: ExperienceItem[] = [
  {
    id: "str-ucture-geomatics-engineer",
    role: "Geomatics Engineer",
    organization: "str.ucture GmbH",
    location: "Stuttgart",
    start: "Sep 2023",
    end: "present",
    bullets: [
      "Develop STR-AI, an AI workspace with LLM chat, retrieval (RAG) and structural-document workflows.",
      "Develop StrToolkit, a Rhino 8 plugin for structural engineering.",
      "Geospatial data pipelines and tools for PALM-4U microclimate simulation.",
    ],
  },
  {
    id: "str-ucture-werkstudent",
    role: "Werkstudent",
    organization: "str.ucture GmbH",
    location: "Stuttgart",
    start: "Nov 2022",
    end: "Aug 2023",
    bullets: [],
  },
  {
    id: "lba-werkstudent",
    role: "Werkstudent",
    organization: "LBA Luftbildauswertung GmbH",
    location: "Stuttgart",
    start: "Jun 2022",
    end: "Feb 2023",
    bullets: [
      "Supported aerial data analysis and geospatial mapping projects.",
      "Processed large-scale datasets using various GIS tools.",
    ],
  },
  {
    id: "shah-technical-coordinator",
    role: "Technical Coordinator",
    organization: "Shah Engineering Consultant",
    start: "2019",
    end: "2021",
    bullets: [],
  },
  {
    id: "realpath-civil-engineer",
    role: "Civil Engineer",
    organization: "Realpath Engineering Consultancy Pvt. Ltd.",
    location: "Kathmandu, Nepal",
    start: "2017",
    end: "2021",
    bullets: [
      "Conducted surveys, design and analysis for airport projects across Nepal.",
      "Developed detailed 3D models for urban development and city infrastructure planning.",
      "Performed GIS-based socio-economic surveys for large-scale infrastructure projects.",
    ],
  },
];
