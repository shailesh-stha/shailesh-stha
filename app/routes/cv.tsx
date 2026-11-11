import { Fragment } from "react";
import type { Route } from "./+types/cv";
import { EducationList, ExperienceList } from "~/components/History";
import { Section } from "~/components/Section";
import { education } from "~/content/education";
import { experience } from "~/content/experience";
import { profile } from "~/content/profile";
import { skills } from "~/content/skills";

export function meta({}: Route.MetaArgs) {
  return [
    { title: `CV | ${profile.name}` },
    { name: "description", content: `Experience, education and skills of ${profile.name}.` },
  ];
}

export default function Cv() {
  return (
    <>
      <section className="page-section">
        <div className="center center--prose stack">
          <header className="page-header">
            <h1 className="text-title">Curriculum vitae</h1>
          </header>
          <p className="lead">{profile.title.en}, {profile.location}</p>
          <div className="prose"><p>{profile.about}</p></div>
        </div>
      </section>
      <Section id="experience" title="Experience">
        <ExperienceList items={experience} />
      </Section>
      <Section id="education" title="Education">
        <EducationList items={education} />
      </Section>
      <Section id="skills" title="Skills">
        <dl className="kv kv--inline">
          {skills.map((group) => (
            <Fragment key={group.label}>
              <dt className="kv__term">{group.label}</dt>
              <dd className="kv__desc">{group.items.join(", ")}</dd>
            </Fragment>
          ))}
        </dl>
      </Section>
    </>
  );
}
