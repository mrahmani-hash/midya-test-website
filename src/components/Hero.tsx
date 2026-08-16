import { motion } from "motion/react";
import { profile } from "../data/profile";

const rise = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__content">
        <motion.div
          className="hero__copy"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.1, delayChildren: 0.3 }}
        >
          <motion.div className="mission-tag" variants={rise}>
            <span className="mission-tag__signal" aria-hidden="true" />
            Personal transmission · Toronto
          </motion.div>

          <motion.p className="hero__kicker" variants={rise}>
            Signal origin · {profile.coordinates}
          </motion.p>
          <motion.h1 id="hero-title" variants={rise}>
            <span>Midya</span>
            <strong>Rahmani</strong>
          </motion.h1>
          <motion.p className="hero__lede" variants={rise}>
            {profile.hero}
          </motion.p>
          <motion.div className="hero__actions" variants={rise}>
            <a
              className="button button--primary"
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              Connect on LinkedIn
              <span aria-hidden="true">↗</span>
            </a>
            <a className="button button--ghost" href="#about">
              Enter orbit
              <span aria-hidden="true">↓</span>
            </a>
          </motion.div>
          <motion.dl className="hero__metrics" variants={rise}>
            <div>
              <dt>Experience</dt>
              <dd>{profile.yearsExperience} years</dd>
            </div>
            <div>
              <dt>Current signal</dt>
              <dd>Adaptavist</dd>
            </div>
            <div>
              <dt>Base</dt>
              <dd>Toronto · CA</dd>
            </div>
          </motion.dl>
        </motion.div>

        <motion.div
          className="hero__portrait-system"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.45 }}
        >
          <div className="portrait-orbit portrait-orbit--outer" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="portrait-orbit portrait-orbit--inner" aria-hidden="true">
            <i />
          </div>
          <div className="portrait-frame">
            <img
              src="/midya-photo.webp"
              alt="Midya Rahmani"
              width="512"
              height="512"
              fetchPriority="high"
            />
            <span className="portrait-frame__scan" aria-hidden="true" />
          </div>
          <div className="portrait-label portrait-label--top">
            <span>IDENT</span>
            MR-043
          </div>
          <div className="portrait-label portrait-label--bottom">
            <span>STATUS</span>
            Signal active
          </div>
        </motion.div>
      </div>

      <a className="scroll-cue" href="#about" aria-label="Scroll to About">
        <span>Scroll to explore</span>
        <i aria-hidden="true" />
      </a>
    </section>
  );
}
