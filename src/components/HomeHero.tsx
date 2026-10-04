/**
 * LIFE SCORE HomeHero: the top of the Compare tab — a live 3D globe beside the
 * six scoring categories as 3D tiles.
 *
 * John, 4 Oct 2026: approved from the sample ("i love your idea", "commit all
 * the changes … so i can see the new homepage"). The words are the site's own
 * (index.html's description; the categories from src/shared/metrics.ts).
 *
 * The globe is COBE (MIT, github.com/shuding/cobe), loaded only when this tab
 * opens, drawn by the graphics card, paused while off screen, still under
 * reduced motion, and left out (the words take the width) where WebGL is missing.
 */

import React, { useEffect, useRef } from 'react';
import Icon3D from './icons3d/Icon3D';
import { CATEGORY_ICON_3D } from './icons3d/icons3d';
import { CATEGORIES } from '../shared/metrics';
import { useSpringTilt } from '../hooks/useSpringTilt';
import type { Category } from '../types/metrics';
import './HomeHero.css';

/** The globe faces the Atlantic at rest (COBE's longitude-to-angle rule), tilted a little. */
const START_PHI = Math.PI - ((-40 * Math.PI) / 180 - Math.PI / 2);
const THETA = 0.3;
/** Radians per millisecond: one turn in about two minutes. */
const SPIN = (2 * Math.PI) / 120_000;

/** A category as a small 3D tile. */
const CategoryTile: React.FC<{ category: Category }> = ({ category }) => {
  const tiltRef = useSpringTilt<HTMLLIElement>(14);
  return (
    <li className="home-hero-cat" ref={tiltRef}>
      <Icon3D name={CATEGORY_ICON_3D[category.id]} size={48} className="home-hero-cat-icon" />
      <span className="home-hero-cat-name">{category.shortName}</span>
      <span className="home-hero-cat-count">{category.metricCount} metrics</span>
    </li>
  );
};

const HomeHero: React.FC = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let frame = 0;
    let visible = true;
    let teardown: (() => void) | undefined;

    const giveUp = (reason: string, error: unknown) => {
      console.warn(`[HomeHero] globe ${reason}`, error);
      stage.hidden = true;
    };

    // COBE does not throw without WebGL; it hands back a globe that never draws.
    // So ask a spare canvas first, and step aside where there is none.
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') ?? probe.getContext('webgl'))) {
      giveUp('has no WebGL on this device', null);
      return;
    }

    import('cobe')
      .then(({ default: createGlobe }) => {
        if (disposed) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        let size = canvas.offsetWidth;
        if (!size) return;

        let globe: ReturnType<typeof createGlobe> | null = null;
        try {
          globe = createGlobe(canvas, {
            devicePixelRatio: dpr,
            width: size * dpr,
            height: size * dpr,
            phi: START_PHI,
            theta: THETA,
            dark: 1,
            diffuse: 1.25,
            mapSamples: 22000,
            mapBrightness: 5.5,
            mapBaseBrightness: 0.04,
            baseColor: [0.16, 0.24, 0.52],
            markerColor: [1, 0.78, 0.36],
            glowColor: [0.28, 0.42, 1],
            markers: [],
          });
        } catch (error) {
          giveUp('could not start (no WebGL?)', error);
        }
        if (!globe) return;
        const live = globe;
        // COBE draws only when updated: the first frame now, then one per animation frame.
        live.update({ phi: START_PHI });

        const t0 = performance.now();
        const tick = (now: number) => {
          live.update({ phi: START_PHI + (now - t0) * SPIN });
          frame = visible ? requestAnimationFrame(tick) : 0;
        };
        const start = () => {
          if (!reduce && visible && !frame) frame = requestAnimationFrame(tick);
        };

        // Turn only while on screen.
        const seen = new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          start();
        });
        seen.observe(canvas);

        const resized = new ResizeObserver(() => {
          const next = canvas.offsetWidth;
          if (next && next !== size) {
            size = next;
            live.update({ width: size * dpr, height: size * dpr });
          }
        });
        resized.observe(canvas);

        teardown = () => {
          seen.disconnect();
          resized.disconnect();
          live.destroy();
        };
        canvas.classList.add('is-ready');
        start();
      })
      .catch((error: unknown) => giveUp('library failed to load', error));

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      teardown?.();
    };
  }, []);

  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero-copy">
        <span className="home-hero-eyebrow">100 metrics · 6 categories</span>
        <h2 className="home-hero-title" id="home-hero-title">
          Compare legal and lived freedom between any two cities worldwide
        </h2>
        <ul className="home-hero-cats" aria-label="The six categories">
          {CATEGORIES.map((category) => (
            <CategoryTile key={category.id} category={category} />
          ))}
        </ul>
      </div>
      <div className="home-hero-stage" ref={stageRef}>
        <canvas className="home-hero-globe" ref={canvasRef} role="img" aria-label="A turning 3D globe" />
      </div>
    </section>
  );
};

export default HomeHero;
