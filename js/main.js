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

  // Part 2+: init functions will be added here
  function init() {
    onResize();
  }

  document.addEventListener("DOMContentLoaded", init);

  // Expose for debugging in the browser console
  window.__mama = { els, state };
})();
