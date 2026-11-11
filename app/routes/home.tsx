import { Link } from "react-router";
import type { Route } from "./+types/home";
import { Icon } from "../../design-system/react";
import { HashLink } from "~/components/HashLink";
import { EducationList, ExperienceList } from "~/components/History";
import { HeroGraph } from "~/components/HeroGraph";
import { Section } from "~/components/Section";
import { WorkCard } from "~/components/WorkCard";
import { certs } from "~/content/certs";
import { education } from "~/content/education";
import { experience } from "~/content/experience";
import { profile } from "~/content/profile";
import { skills } from "~/content/skills";
import { work } from "~/content/work";

export function meta({}: Route.MetaArgs) {
  return [
    { title: profile.siteTitle },
    { name: "description", content: profile.description },
  ];
}

export default function Home() {
  return (
    <>
      <section className="page-section app-hero" aria-labelledby="hero-title">
        <HeroGraph />
        <div className="app-hero__content center app-wide">
          <div className="stack app-measure">
            <span className="eyebrow">{profile.title.en}</span>
            <h1 className="text-display" id="hero-title">{profile.headline}</h1>
            <p className="lead">{profile.lead}</p>
            <div className="cluster">
              <HashLink className="btn btn--primary" to="/#work">View my work</HashLink>
              <Link className="btn" to="/cv">Read my CV</Link>
            </div>
          </div>
        </div>
      </section>

      <Section id="work" title="Work" lead="Tools I build for structural engineers and architects. Each label states how far the tool has come.">
        <div className="container">
          <div className="grid grid--cols-3 app-equal">
            {work.map((item) => <WorkCard key={item.id} item={item} />)}
          </div>
        </div>
      </Section>

      <Section id="skills" title="Skills">
        <div className="container">
          <div className="grid grid--cols-2">
            {skills.map((group) => (
              <div key={group.label} className="stack stack--sm">
                <h3 className="text-heading text-heading--sm">{group.label}</h3>
                <div className="cluster cluster--sm">
                  {group.items.map((item) => <span key={item} className="badge">{item}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="experience" title="Experience">
        <ExperienceList items={experience} />
      </Section>

      <Section id="education" title="Education">
        <EducationList items={education} />
      </Section>

      <Section id="certifications" title="Certifications">
        <div className="container">
          <div className="grid grid--cols-2">
            {certs.map((cert) => (
              <article key={cert.id} className="card">
                <div className="card__body stack stack--sm">
                  <h3 className="card__title">{cert.name}</h3>
                  <p className="muted">{cert.issuer}</p>
                  <div>
                    <a className="btn btn--sm" href={cert.verifyUrl} target="_blank" rel="noopener noreferrer">
                      Verify credential
                      <Icon name="external-link" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Section id="contact" title="Contact" lead="Happy to talk about AI and engineering software.">
        <div className="cluster">
          <a className="btn" href={profile.links.github} target="_blank" rel="noopener noreferrer">
            <Icon name="git-branch" />
            GitHub
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a className="btn" href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">
            <Icon name="user" />
            LinkedIn
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </Section>
    </>
  );
}
