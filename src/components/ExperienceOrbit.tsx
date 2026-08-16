import { motion } from "motion/react";
import { profile } from "../data/profile";
import { SectionHeader } from "./SectionHeader";

export function ExperienceOrbit() {
  return (
    <section className="section" id="experience">
      <SectionHeader
        number="02"
        eyebrow="Orbital history"
        title="Professional journey"
        description="Organizations and coordinates along the path—kept intentionally simple."
      />

      <ol className="orbit-timeline">
        {profile.experience.map((entry, index) => (
          <motion.li
            key={`${entry.organization}-${entry.period}`}
            initial={{ opacity: 0, x: index % 2 === 0 ? -28 : 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: index * 0.08 }}
          >
            <span className="orbit-timeline__node" aria-hidden="true">
              <i />
            </span>
            <article className="orbit-card">
              <div className="orbit-card__meta">
                <span>ORBIT {String(index + 1).padStart(2, "0")}</span>
                {entry.active ? <em>Active signal</em> : <span>Archived signal</span>}
              </div>
              <h3>{entry.organization}</h3>
              <p>
                {entry.period}
                <span aria-hidden="true"> · </span>
                {entry.location}
              </p>
            </article>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
