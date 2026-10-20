/* =========================================================
   Part 4 — Growth animation
   Stems draw up out of the ground, leaves unfurl from the stem
   (pink-red young growth that matures to green), then the bud
   pops out at the tip. Built with GSAP timelines.
   ========================================================= */

(() => {
  "use strict";

  const rand = (min, max) => Math.random() * (max - min) + min;

  /**
   * Tween an SVG element's transform attribute through a proxy object.
   * Rotation/scale happen around the element's local (0,0), which is
   * exactly where leaves attach and where the bud sits on the stem.
   */
  function tweenTransform(target, from, to, vars) {
    const p = { ...from };
    const apply = () =>
      target.setAttribute("transform", `rotate(${p.r.toFixed(2)}) scale(${Math.max(p.s, 0.0001).toFixed(4)})`);
    apply();
    return gsap.to(p, { ...to, ...vars, onUpdate: apply });
  }

  // Hide everything before the first frame so nothing flashes
  function prepare(plant) {
    const len = plant.stem.getTotalLength();
    plant.stemLength = len;
    gsap.set(plant.stem, { strokeDasharray: `${len} ${len}`, strokeDashoffset: len });

    plant.leaves.forEach((leaf) => {
      leaf.blade.setAttribute("transform", `rotate(${-leaf.side * 50}) scale(0.0001)`);
      if (!leaf.young) leaf.tint.setAttribute("opacity", 1);
    });

    plant.headInner.setAttribute("transform", "scale(0.0001)");
  }

  // One plant's growth timeline
  function growPlant(plant) {
    const tl = gsap.timeline();
    const stemDur = (plant.depth === "back" ? 1.8 : 2.4) + rand(-0.2, 0.3);

    // 1. Stem draws upward from the ground
    tl.to(plant.stem, {
      strokeDashoffset: 0,
      duration: stemDur,
      ease: "power2.inOut",
    }, 0);

    // 2. Leaves unfurl as the stem passes them (bouncy "back" ease)
    plant.leaves.forEach((leaf) => {
      const at = stemDur * leaf.t * 0.9 + rand(0, 0.15);
      tl.add(
        tweenTransform(leaf.blade, { r: -leaf.side * 50, s: 0 }, { r: 0, s: 1 }, {
          duration: rand(0.9, 1.2),
          ease: "back.out(1.7)",
        }),
        at
      );

      // 3. Mature leaves fade from pink-red to glossy green
      if (!leaf.young) {
        tl.to(leaf.tint, {
          attr: { opacity: 0 },
          duration: 1.6,
          ease: "sine.inOut",
        }, at + 0.7);
      }
    });

    // 4. Bud pops out at the tip with a little overshoot
    tl.add(
      tweenTransform(plant.headInner, { r: -20, s: 0 }, { r: 0, s: 1 }, {
        duration: 0.9,
        ease: "back.out(2.2)",
      }),
      stemDur - 0.15
    );

    return tl;
  }

  /**
   * Grow the whole garden. Middle front plants start first,
   * outer and back plants follow — like a wave of life.
   * @returns {gsap.core.Timeline}
   */
  function growGarden(plants, { width }) {
    const master = gsap.timeline({ paused: true });

    plants.forEach((plant) => {
      prepare(plant);
      const fromCenter = Math.abs(plant.x / width - 0.5) * 2; // 0 center → 1 edge
      const delay = plant.depth === "front"
        ? fromCenter * 0.8 + rand(0, 0.2)
        : 0.6 + fromCenter * 0.6 + rand(0, 0.4);
      master.add(growPlant(plant), delay);
    });

    return master;
  }

  window.Growth = { growGarden, tweenTransform };
})();
