/* =========================================================
   Part 13 — Love everywhere
   • Heart constellation: stars pop in one by one and connect
     into a big heart framing "Mama" + the message
   • Moon with a sleepy blushing face; tap it → happy + extra blush
   ========================================================= */

(() => {
  "use strict";

  const { el } = window.MesuaFlower;

  // Classic heart curve; x ∈ [-16, 16], y ∈ [-17, 12] (y up)
  const heartPoint = (t) => ({
    x: 16 * Math.pow(Math.sin(t), 3),
    y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
  });

  const love = {
    svg: null,
    drawn: false,
    tl: null,

    /* ---------- Heart constellation ---------- */

    // Heart box: from just above the name to a bit below the message
    frame() {
      const w = window.innerWidth;
      const name = document.querySelector(".message__name");
      const page = document.querySelector(".message__page");
      if (!name || !page) return null;
      const n = name.getBoundingClientRect();
      const p = page.getBoundingClientRect();
      const top = n.top - 22;
      const bottom = p.bottom + 64;
      return {
        cx: w / 2,
        cy: (top + bottom) / 2,
        width: Math.min(w * 0.9, 540),
        height: bottom - top,
      };
    },

    build() {
      const sky = document.getElementById("sky");
      const box = this.frame();
      if (!sky || !box) return;
      if (this.svg) this.svg.remove();

      const svg = el("svg", {
        class: "constellation",
        viewBox: `0 0 ${window.innerWidth} ${window.innerHeight}`,
        preserveAspectRatio: "none",
      });
      const defs = el("defs", {}, svg);
      const g = el("radialGradient", { id: "gStarGlow" }, defs);
      el("stop", { offset: "0%", "stop-color": "#ffffff", "stop-opacity": 1 }, g);
      el("stop", { offset: "35%", "stop-color": "#ffd1e4", "stop-opacity": 0.6 }, g);
      el("stop", { offset: "100%", "stop-color": "#ff8fb8", "stop-opacity": 0 }, g);

      const sx = box.width / 32;
      const sy = box.height / 29;
      const N = 18;
      const pts = Array.from({ length: N }, (_, i) => {
        const p = heartPoint((i / N) * Math.PI * 2);
        return { x: box.cx + p.x * sx, y: box.cy - (p.y + 2.5) * sy };
      });

      const lines = el("g", { class: "constellation__lines" }, svg);
      const stars = el("g", { class: "constellation__stars" }, svg);

      this.lines = pts.map((a, i) => {
        const b = pts[(i + 1) % N];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        return Object.assign(el("line", {
          x1: a.x.toFixed(1), y1: a.y.toFixed(1), x2: b.x.toFixed(1), y2: b.y.toFixed(1),
          "stroke-dasharray": `${len} ${len}`,
          "stroke-dashoffset": len,
        }, lines), { len });
      });

      this.stars = pts.map((p, i) => {
        const pos = el("g", { transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})` }, stars);
        // Outer group pops in (GSAP), inner group twinkles (CSS) — kept separate
        const star = el("g", { class: "constellation__star" }, pos);
        const twinkle = el("g", {
          class: "constellation__twinkle",
          style: `--tw:${(1.6 + Math.random() * 2).toFixed(2)}s;--twd:${(-Math.random() * 3).toFixed(2)}s`,
        }, star);
        el("circle", { r: i % 3 === 0 ? 8 : 6, fill: "url(#gStarGlow)" }, twinkle);
        el("circle", { r: i % 3 === 0 ? 1.9 : 1.4, fill: "#fff" }, twinkle);
        return star;
      });

      // Behind the clouds, in front of the stars
      sky.insertBefore(svg, document.getElementById("clouds"));
      this.svg = svg;

      if (this.drawn) this.showInstantly();
      else this.hide();
    },

    hide() {
      this.stars.forEach((s) => s.setAttribute("opacity", 0));
    },

    showInstantly() {
      this.stars.forEach((s) => s.setAttribute("opacity", 1));
      this.lines.forEach((l) => l.setAttribute("stroke-dashoffset", 0));
      this.svg.classList.add("is-drawn");
    },

    // Stars pop in around the heart, each line drawing to the next star
    draw(reduced) {
      if (!this.svg) this.build();
      if (!this.svg || this.drawn) return;
      this.drawn = true;
      if (reduced || !window.gsap) return this.showInstantly();

      const tl = gsap.timeline({ onComplete: () => this.svg.classList.add("is-drawn") });
      const step = 0.2;
      this.stars.forEach((star, i) => {
        tl.fromTo(star, { attr: { opacity: 0 } }, { attr: { opacity: 1 }, duration: 0.25 }, i * step);
        tl.fromTo(star, { scale: 0, transformOrigin: "50% 50%" },
          { scale: 1, duration: 0.5, ease: "back.out(3)" }, i * step);
        const line = this.lines[i];
        tl.to(line, { attr: { "stroke-dashoffset": 0 }, duration: step * 1.2, ease: "none" }, i * step + 0.1);
      });
      this.tl = tl;
    },

    /* ---------- Moon face ---------- */

    moonTimer: null,

    moonBlush() {
      const moon = document.querySelector(".moon");
      if (!moon) return;
      moon.classList.remove("is-blushing");
      void moon.offsetWidth; // restart the wiggle animation
      moon.classList.add("is-blushing");
      clearTimeout(this.moonTimer);
      this.moonTimer = setTimeout(() => moon.classList.remove("is-blushing"), 2600);
    },

    // Is (x, y) on the moon? (a little generous for fingers)
    hitsMoon(x, y) {
      const body = document.querySelector(".moon__body");
      if (!body) return false;
      const r = body.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return Math.hypot(x - cx, y - cy) < r.width / 2 + 12;
    },

    init() {
      // Rebuild the constellation after rotation (keeps it drawn if it was)
      let t;
      window.addEventListener("resize", () => {
        clearTimeout(t);
        t = setTimeout(() => this.svg && this.build(), 350);
      }, { passive: true });
    },
  };

  window.Love = love;
})();
