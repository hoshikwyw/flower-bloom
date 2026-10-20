/* =========================================================
   Flowers For Mama — main entry
   Each part of the experience lives in its own init function,
   filled in as we build it.
   ========================================================= */

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const els = {
    scene: $("#scene"),
    sky: $("#sky"),
    garden: $("#garden"),
    particles: $("#particles"),
    message: $("#message"),
    intro: $("#intro"),
    controls: $("#controls"),
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Shared state
  const state = {
    width: window.innerWidth,
    height: window.innerHeight,
    isSmall: window.innerWidth <= 390, // iPhone 12 mini = 375
    reducedMotion: prefersReducedMotion,
  };

  // Keep size info fresh (rotation, Safari toolbar show/hide)
  const onResize = () => {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.isSmall = state.width <= 390;
  };
  window.addEventListener("resize", onResize, { passive: true });

  const rand = (min, max) => Math.random() * (max - min) + min;

  /* ---------------------------------------------------------
     Part 2 — Night sky: twinkling stars + shooting stars
     --------------------------------------------------------- */
  const sky = {
    starsEl: $("#stars"),
    shootingEl: $("#shooting-stars"),
    shootingTimer: null,

    // Fewer stars on small phones keeps it light and smooth
    starCount() {
      const area = state.width * state.height;
      return Math.round(Math.min(180, Math.max(60, area / 4500)));
    },

    createStars() {
      const frag = document.createDocumentFragment();
      const count = this.starCount();

      for (let i = 0; i < count; i++) {
        const star = document.createElement("span");
        const bright = Math.random() < 0.08;
        star.className = bright ? "star star--bright" : "star";

        // Keep stars above the hills (top ~72% of the screen)
        star.style.left = `${rand(0, 100)}%`;
        star.style.top = `${rand(0, 72)}%`;
        star.style.setProperty("--size", `${bright ? rand(2, 3) : rand(1, 2.2)}px`);
        star.style.setProperty("--dur", `${rand(1.8, 4.5)}s`);
        star.style.setProperty("--delay", `${rand(-4, 0)}s`);
        star.style.setProperty("--min-o", rand(0.15, 0.5).toFixed(2));
        frag.appendChild(star);
      }

      this.starsEl.replaceChildren(frag);
    },

    spawnShootingStar() {
      const s = document.createElement("span");
      s.className = "shooting-star";

      // Start in the upper-right half, fly down-left
      const angle = rand(150, 165);
      const distance = rand(state.width * 0.4, state.width * 0.7);
      const rad = (angle * Math.PI) / 180;

      s.style.left = `${rand(40, 95)}%`;
      s.style.top = `${rand(2, 30)}%`;
      s.style.setProperty("--angle", `${angle}deg`);
      s.style.setProperty("--dx", Math.cos(rad) * distance);
      s.style.setProperty("--dy", Math.sin(rad) * distance);
      s.style.setProperty("--dur", `${rand(0.9, 1.5)}s`);

      s.addEventListener("animationend", () => s.remove(), { once: true });
      this.shootingEl.appendChild(s);
    },

    scheduleShootingStars() {
      const next = () => {
        this.shootingTimer = setTimeout(() => {
          if (!document.hidden) this.spawnShootingStar();
          next();
        }, rand(5000, 11000));
      };
      next();
    },

    init() {
      els.sky.classList.add("sky-enter");
      this.createStars();
      if (!state.reducedMotion) this.scheduleShootingStars();

      // Rebuild stars after rotation / big size changes
      let lastW = state.width;
      let t;
      window.addEventListener("resize", () => {
        clearTimeout(t);
        t = setTimeout(() => {
          if (Math.abs(state.width - lastW) > 80) {
            lastW = state.width;
            this.createStars();
          }
        }, 250);
      }, { passive: true });
    },
  };

  function init() {
    onResize();
    sky.init();
  }

  document.addEventListener("DOMContentLoaded", init);

  // Expose for debugging in the browser console
  window.__mama = { els, state };
})();
