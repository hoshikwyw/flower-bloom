/* =========================================================
   Part 5 — Bloom animation
   Bud swells and wobbles → 4 petals unfold one after another
   → golden stamens burst out like fireworks → glow + ring pulse.
   ========================================================= */

(() => {
  "use strict";

  const rand = (min, max) => Math.random() * (max - min) + min;
  const { tweenTransform } = window.Growth;
  const { el } = window.MesuaFlower;

  // Read the rotate(N) the builder gave each petal / stamen
  const baseAngle = (node) =>
    parseFloat((node.getAttribute("transform") || "").match(/rotate\(([-\d.]+)/)?.[1] || 0);

  // Petals & stamens keep their own angle, plus an animated twist + scale
  function rotScale(node, base, p) {
    node.setAttribute(
      "transform",
      `rotate(${(base + p.r).toFixed(2)}) scale(${Math.max(p.sx, 0.0001).toFixed(4)} ${Math.max(p.sy, 0.0001).toFixed(4)})`
    );
  }

  function prepare(plant) {
    const f = plant.flower;
    if (!f) return;

    f.root.setAttribute("opacity", 0);
    f.glow.setAttribute("opacity", 0);
    f.stamenGlow.setAttribute("opacity", 0);
    f.sepals.setAttribute("transform", "scale(0.4)");
    f.pistil.setAttribute("transform", "scale(0.0001)");

    // Petals start folded: narrow, short and twisted
    f.petalStates = f.petals.map((petal) => {
      const s = { node: petal, base: baseAngle(petal), p: { r: -35, sx: 0.2, sy: 0.25 } };
      rotScale(petal, s.base, s.p);
      return s;
    });

    f.stamenStates = f.stamens.map((stamen) => {
      const s = { node: stamen, base: baseAngle(stamen), p: { r: 0, sx: 0, sy: 0 } };
      rotScale(stamen, s.base, s.p);
      return s;
    });

    // Golden ring that ripples out when the flower opens
    if (!f.ring) {
      f.ring = el("circle", {
        class: "flower__ring",
        r: 10,
        fill: "none",
        stroke: "#ffe27a",
        "stroke-width": 3,
        opacity: 0,
      }, f.root);
    }
  }

  function bloomFlower(plant) {
    const f = plant.flower;
    const tl = gsap.timeline();

    // 1. Bud swells and wobbles — something is about to happen…
    tl.add(tweenTransform(plant.bud, { r: 0, s: 1 }, { keyframes: [
      { r: -8, s: 1.15, duration: 0.25 },
      { r: 7, s: 1.25, duration: 0.25 },
      { r: -4, s: 1.3, duration: 0.2 },
      { r: 0, s: 1.35, duration: 0.15 },
    ] }, { ease: "sine.inOut" }), 0);

    // 2. Bud melts away as the flower appears
    tl.to(plant.bud, { attr: { opacity: 0 }, duration: 0.35, ease: "power1.in" }, 0.75);
    tl.to(f.root, { attr: { opacity: 1 }, duration: 0.3 }, 0.7);
    tl.add(tweenTransform(f.sepals, { r: 0, s: 0.4 }, { r: 0, s: 1 }, {
      duration: 0.8, ease: "back.out(2)",
    }), 0.7);

    // 3. Petals unfold one by one with a soft overshoot
    f.petalStates.forEach((s, i) => {
      tl.to(s.p, {
        r: 0,
        sx: 1,
        sy: 1,
        duration: 1.1,
        ease: "back.out(1.5)",
        onUpdate: () => rotScale(s.node, s.base, s.p),
      }, 0.8 + i * 0.18);
    });

    // 4. Golden stamens burst out from the centre like fireworks
    const burstAt = 1.35;
    f.stamenStates.forEach((s) => {
      tl.to(s.p, {
        sx: 1,
        sy: 1,
        duration: rand(0.55, 0.9),
        ease: "elastic.out(1, 0.55)",
        onUpdate: () => rotScale(s.node, s.base, s.p),
      }, burstAt + rand(0, 0.45));
    });
    tl.add(tweenTransform(f.pistil, { r: 0, s: 0 }, { r: 0, s: 1 }, {
      duration: 0.5, ease: "back.out(3)",
    }), burstAt);

    // 5. Light: stamen glow flashes then settles, flower halo fades in
    tl.to(f.stamenGlow, { keyframes: [
      { attr: { opacity: 1, r: 60 }, duration: 0.35, ease: "power2.out" },
      { attr: { opacity: 0.85, r: 42 }, duration: 0.9, ease: "sine.inOut" },
    ] }, burstAt);
    tl.to(f.glow, { attr: { opacity: 1 }, duration: 1.4, ease: "sine.out" }, burstAt);

    // 6. Golden ring ripples outward and fades
    tl.fromTo(f.ring,
      { attr: { r: 10, opacity: 0.9, "stroke-width": 3 } },
      { attr: { r: 110, opacity: 0, "stroke-width": 0.5 }, duration: 1.2, ease: "power2.out" },
      burstAt + 0.05);

    return tl;
  }

  /**
   * Bloom every flower plant in a wave from the centre outward.
   * Plants of kind "bud" stay closed (for tapping later, Part 8).
   */
  function bloomGarden(plants, { width }) {
    const master = gsap.timeline({ paused: true });
    plants
      .filter((p) => p.flower)
      .forEach((plant) => {
        prepare(plant);
        const fromCenter = Math.abs(plant.x / width - 0.5) * 2;
        const delay = (plant.depth === "front" ? 0 : 0.5) + fromCenter * 0.9 + rand(0, 0.2);
        master.add(bloomFlower(plant), delay);
      });
    return master;
  }

  window.Bloom = { bloomGarden, bloomFlower, prepare };
})();
