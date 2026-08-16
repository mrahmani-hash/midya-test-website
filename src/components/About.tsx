import { motion } from "motion/react";
import { profile } from "../data/profile";
import { SectionHeader } from "./SectionHeader";

export function About() {
  return (
    <section className="section section--about" id="about">
      <SectionHeader
        number="01"
        eyebrow="Profile data"
        title="A little about me"
        description="A personal signal from Toronto, shaped by curiosity, movement, and a view toward what comes next."
      />

      <div className="about-grid">
        <motion.article
          className="glass-panel about-copy"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65 }}
        >
          <span className="panel-coordinate" aria-hidden="true">
            LOG // 01.438
          </span>
          {profile.about.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <a
            className="text-link"
            href={profile.linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            Continue on LinkedIn <span aria-hidden="true">↗</span>
          </a>
        </motion.article>

        <motion.aside
          className="identity-console"
          aria-label="Identity coordinates"
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.65, delay: 0.12 }}
        >
          <div className="identity-console__radar" aria-hidden="true">
            <span />
            <i />
            <b />
          </div>
          <dl>
            <div>
              <dt>Location</dt>
              <dd>{profile.location}</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>English · Persian</dd>
            </div>
            <div>
              <dt>Perspective</dt>
              <dd>Global · Future-facing</dd>
            </div>
          </dl>
        </motion.aside>
      </div>
    </section>
  );
}
