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

        // Stars live in the deeper upper sky; more of them near the top
        const top = Math.pow(Math.random(), 1.4) * 58;
        star.style.left = `${rand(0, 100)}%`;
        star.style.top = `${top}%`;
        star.style.setProperty("--size", `${bright ? rand(2, 3) : rand(1, 2.2)}px`);
        star.style.setProperty("--dur", `${rand(1.8, 4.5)}s`);
        star.style.setProperty("--delay", `${rand(-4, 0)}s`);
        star.style.setProperty("--min-o", (rand(0.15, 0.5) * (1 - top / 90)).toFixed(2));
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
      setTimeout(() => s.remove(), 3000); // safety net if animationend never fires
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

    /* Part 11 — fluffy pastel clouds: white puffs on a pink underside */
    cloudSVG() {
      // A few overlapping puffs; randomised so no two clouds look the same
      const puffs = [
        [38, 52, rand(20, 26)],
        [70, rand(34, 42), rand(26, 32)],
        [105, rand(38, 46), rand(22, 28)],
        [132, 54, rand(16, 22)],
      ];
      const circles = (dy, fill) =>
        puffs.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy + dy}" r="${r.toFixed(1)}" fill="${fill}"/>`).join("") +
        `<rect x="30" y="${50 + dy}" width="110" height="${24}" rx="12" fill="${fill}"/>`;
      return `<svg viewBox="0 0 170 80">${circles(5, "var(--cloud-shade)")}${circles(0, "var(--cloud)")}</svg>`;
    },

    createClouds() {
      const el = $("#clouds");
      if (!el) return;
      const count = state.width <= 500 ? 4 : 6;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const c = document.createElement("div");
        c.className = "cloud";
        // Two bands: small clouds above the name, bigger ones between message and flowers
        const high = i % 2 === 1;
        const w = (high ? rand(0.16, 0.24) : rand(0.26, 0.4)) * Math.min(state.width, 700);
        const dur = rand(70, 130);
        c.style.top = `${high ? rand(0.5, 4) : rand(38, 50)}%`;
        c.style.setProperty("--w", `${w.toFixed(0)}px`);
        c.style.setProperty("--o", rand(0.9, 1).toFixed(2));
        c.style.setProperty("--dur", `${dur.toFixed(0)}s`);
        c.style.setProperty("--delay", `${(-rand(0, dur)).toFixed(0)}s`); // start mid-journey
        c.style.setProperty("--bob", `${rand(4, 8).toFixed(1)}s`);
        c.innerHTML = this.cloudSVG();
        frag.appendChild(c);
      }
      el.replaceChildren(frag);
    },

    init() {
      els.sky.classList.add("sky-enter");
      this.createStars();
      this.createClouds();
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
            this.createClouds();
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
    // GSAP timelines: growth (Part 4) → bloom (Part 5).
    // Once a stage has played, rebuilds (rotation) jump straight to its end.
    timelines: { growth: null, bloom: null },
    played: { growth: false, bloom: false },

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

      // Phone in landscape: shorter plants so they don't cover the message
      const short = w > h && h < 520;
      const frontH = short ? [0.19, 0.06] : [0.3, 0.1]; // [base, extra for the middle]
      const backH = short ? [0.13, 0.17] : [0.2, 0.27];  // [min, max]

      // Back row: smaller, mix of buds and flowers
      for (let i = 0; i < backCount; i++) {
        plants.push({
          x: w * (0.1 + (0.8 * i) / (backCount - 1)) + rand(-w * 0.02, w * 0.02),
          lean: i === 0 ? 1 : i === backCount - 1 ? -1 : 0,
          y: top - rand(4, 14),
          height: h * rand(backH[0], backH[1]),
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
          height: h * (frontH[0] + centerness * frontH[1] + rand(-0.02, 0.02)),
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

      // Part 12: grass tufts + baby flowers in front, hiding the stem bases
      const top = this.groundTop();
      this.fore = window.MesuaFlower.createForeground(svg, {
        width: state.width,
        top: top + 6,
        bottom: state.height - 8,
        small: state.width <= 500,
      });
      if (this.played.growth || state.reducedMotion) this.fore.classList.add("is-grown");

      els.garden.replaceChildren(svg);
      this.svg = svg;

      // Part 6: wind needs to know about the new plants
      if (window.Ambient && window.Ambient.canvas) window.Ambient.setPlants(this.plants);

      // Set up the timelines (needs the SVG in the DOM to measure stems).
      // Without GSAP (offline), the garden simply shows fully bloomed.
      if (window.gsap && window.Growth && window.Bloom) {
        Object.values(this.timelines).forEach((tl) => tl && tl.kill());
        this.timelines.growth = window.Growth.growGarden(this.plants, state);
        this.timelines.bloom = window.Bloom.bloomGarden(this.plants, state);

        for (const name in this.timelines) {
          if (this.played[name] || state.reducedMotion) this.timelines[name].progress(1);
        }
      } else {
        this.plants.forEach((p) => p.flower && p.flower.root.setAttribute("opacity", 1));
      }
    },

    // Play one stage ("growth" | "bloom"); resolves when it finishes
    play(name) {
      return new Promise((resolve) => {
        const tl = this.timelines[name];
        const done = this.played[name] || !tl || tl.progress() === 1;
        this.played[name] = true;
        // Grass & baby flowers pop up together with the stems
        if (name === "growth" && this.fore) this.fore.classList.add("is-grown");
        if (done) return resolve();
        tl.eventCallback("onComplete", resolve);
        tl.play();
      });
    },

    async grow() {
      await this.play("growth");
      await this.play("bloom");
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

    // Part 6: wind + particles (skipped entirely for reduced motion)
    const ambient = window.Ambient;
    const motion = ambient && !state.reducedMotion;
    if (motion) {
      ambient.init(els.particles, garden.plants);
      ambient.start();
    }

    // Part 7: the envelope starts everything
    //   tap → envelope opens → plants grow → name + message appear while flowers bloom
    // Part 8: taps, nudges, music button
    const interact = window.Interact;
    const music = window.Music;
    music.init();
    interact.init({ scene: els.scene, controls: els.controls, hint: $("#tap-hint"), garden, state });

    window.Message.build(els.message, state.reducedMotion);
    window.Intro.init(els.intro, {
      // Same tap that opens the envelope starts the music (iOS needs a real tap)
      onTap: () => {
        music.play();
        interact.setMusicUI(music.enabled);
        interact.showControls(els.controls);
      },
      onOpened: async () => {
        interact.enable();
        els.scene.classList.add("is-interactive");
        await garden.play("growth");
        window.Message.play().then(() => setTimeout(() => interact.showHint(), 1500));
        await garden.play("bloom");
        if (motion) ambient.startParticles();
        // Part 13: stars connect into a heart around her name
        window.Love.draw(state.reducedMotion);
      },
    });
    window.Love.init();
  }

  document.addEventListener("DOMContentLoaded", init);

  // Expose for debugging in the browser console
  window.__mama = { els, state, garden };
})();
