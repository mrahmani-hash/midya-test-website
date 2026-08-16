import { useCallback, useEffect, useState } from "react";
import { MotionConfig, useReducedMotion } from "motion/react";
import { About } from "./components/About";
import { Contact } from "./components/Contact";
import { EducationPlanets } from "./components/EducationPlanets";
import { ExperienceOrbit } from "./components/ExperienceOrbit";
import { GalaxyBackground } from "./components/GalaxyBackground";
import { Hero } from "./components/Hero";
import { InterestsSignals } from "./components/InterestsSignals";
import { Navigation } from "./components/Navigation";

function App() {
  const reduceMotion = useReducedMotion();
  const [galaxyReady, setGalaxyReady] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleGalaxyReady = useCallback(() => setGalaxyReady(true), []);

  useEffect(() => {
    if (reduceMotion) {
      setBootComplete(true);
      return;
    }

    const maximumWait = window.setTimeout(() => setBootComplete(true), 4200);
    if (!galaxyReady) return () => window.clearTimeout(maximumWait);

    const reveal = window.setTimeout(() => setBootComplete(true), 650);
    return () => {
      window.clearTimeout(maximumWait);
      window.clearTimeout(reveal);
    };
  }, [galaxyReady, reduceMotion]);

  useEffect(() => {
    let scheduled = false;
    const update = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(
        scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0,
      );
      scheduled = false;
    };
    const handleScroll = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <GalaxyBackground onReady={handleGalaxyReady} />
      <div className="space-scrim" aria-hidden="true" />
      <div className="space-grid" aria-hidden="true" />
      <div className="space-noise" aria-hidden="true" />

      <div
        className="scroll-progress"
        style={{ transform: `scaleX(${scrollProgress})` }}
        aria-hidden="true"
      />

      <div
        className={`boot-screen${bootComplete ? " is-complete" : ""}`}
        aria-hidden="true"
      >
        <div className="boot-screen__mark">
          <span>M</span>
          <i />
        </div>
        <p>CALIBRATING PERSONAL UNIVERSE</p>
        <div className="boot-screen__bar">
          <span className={galaxyReady ? "is-ready" : ""} />
        </div>
        <small>{galaxyReady ? "SIGNAL LOCKED" : "MAPPING STAR FIELD"}</small>
      </div>

      <Navigation />
      <main id="main">
        <Hero />
        <About />
        <ExperienceOrbit />
        <EducationPlanets />
        <InterestsSignals />
        <Contact />
      </main>
    </MotionConfig>
  );
}

export default App;
