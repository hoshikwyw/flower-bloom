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

  /* ---------------------------------------------------------
     Part 3 — Garden: lay out Mesua ferrea plants on the hills
     --------------------------------------------------------- */
  const garden = {
    svg: null,
    plants: [],

    // Same height as the .ground SVG in CSS (26%, min 150px)
    groundHeight() {
      return Math.max(state.height * 0.26, 150);
    },

    // Front hill surface sits ~62% down the ground area
    groundTop() {
      return state.height - this.groundHeight() * 0.38;
    },

    // Plant positions + sizes for the current screen
    layout() {
      const w = state.width;
      const h = state.height;
      const frontCount = w < 500 ? 3 : w < 900 ? 4 : 5;
      const backCount = frontCount + 1;

      // 1 = iPhone 12 mini; grows on bigger screens, never too tall on landscape
      const base = Math.min(1.6, Math.max(0.85, Math.min(w, h * 0.6) / 375));
      const top = this.groundTop();
      const plants = [];

      // Back row: smaller, mix of buds and flowers
      for (let i = 0; i < backCount; i++) {
        plants.push({
          x: w * (0.06 + (0.88 * i) / (backCount - 1)) + rand(-w * 0.03, w * 0.03),
          lean: i === 0 ? 1 : i === backCount - 1 ? -1 : 0,
          y: top - rand(4, 14),
          height: h * rand(0.2, 0.27),
          scale: base * 0.65,
          kind: i % 2 === 0 ? "bud" : "flower",
          depth: "back",
        });
      }

      // Front row: big blooms, the middle one tallest.
      // Outer plants lean inward so their flowers stay fully on screen.
      for (let i = 0; i < frontCount; i++) {
        const pos = (i + 0.5) / frontCount;
        const centerness = 1 - Math.abs(pos - 0.5) * 2;
        plants.push({
          x: w * (0.08 + pos * 0.84) + rand(-w * 0.02, w * 0.02),
          lean: i === 0 ? 1 : i === frontCount - 1 ? -1 : 0,
          y: top + rand(4, 16),
          height: h * (0.3 + centerness * 0.1 + rand(-0.02, 0.02)),
          scale: base,
          kind: "flower",
          depth: "front",
        });
      }

      return plants;
    },

    build() {
      const { el, addDefs, createPlant } = window.MesuaFlower;

      const svg = el("svg", {
        class: "garden",
        viewBox: `0 0 ${state.width} ${state.height}`,
        preserveAspectRatio: "xMidYMax slice",
      });
      addDefs(svg);

      const back = el("g", { class: "garden__back" }, svg);
      const front = el("g", { class: "garden__front" }, svg);

      this.plants = this.layout().map((spec) =>
        createPlant(spec.depth === "back" ? back : front, spec)
      );

      els.garden.replaceChildren(svg);
      this.svg = svg;
    },

    init() {
      this.build();

      // Rebuild on rotation / big resizes (ignore Safari toolbar jiggle)
      let lastW = state.width;
      let lastH = state.height;
      let t;
      window.addEventListener("resize", () => {
        clearTimeout(t);
        t = setTimeout(() => {
          if (Math.abs(state.width - lastW) > 80 || Math.abs(state.height - lastH) > 150) {
            lastW = state.width;
            lastH = state.height;
            this.build();
          }
        }, 300);
      }, { passive: true });
    },
  };

  function init() {
    onResize();
    sky.init();
    garden.init();
  }

  document.addEventListener("DOMContentLoaded", init);

  // Expose for debugging in the browser console
  window.__mama = { els, state, garden };
})();
