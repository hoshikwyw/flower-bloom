/* =========================================================
   Mesua ferrea (Ceylon ironwood / ကံ့ကော်) — SVG builder
   Builds plants from reusable parts so later parts can
   animate them: stem, leaves, bud, petals, stamens.

   All flower parts are drawn around (0,0) in "flower units":
   petal length ≈ 70, so a full flower is ≈ 140 units wide.
   ========================================================= */

(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const rand = (min, max) => Math.random() * (max - min) + min;

  function el(tag, attrs = {}, parent) {
    const node = document.createElementNS(NS, tag);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function gradient(parent, type, id, attrs, stops) {
    const g = el(type, { id, ...attrs }, parent);
    stops.forEach(([offset, color, opacity = 1]) =>
      el("stop", { offset, "stop-color": color, "stop-opacity": opacity }, g)
    );
    return g;
  }

  /* ---------- Shared gradients (added once per SVG) ---------- */
  function addDefs(svg) {
    const defs = el("defs", {}, svg);

    // Petal: warm cream at the base fading to pure white at the edge.
    // userSpaceOnUse keeps the gradient centred on the flower for every rotated petal.
    gradient(defs, "radialGradient", "gPetal",
      { gradientUnits: "userSpaceOnUse", cx: 0, cy: 0, r: 72 },
      [["0%", "#f2e4bf"], ["22%", "#fbf4e2"], ["55%", "#fffdf7"], ["100%", "#ffffff"]]);

    // Cute pink blush toward the petal tips (Part 12)
    gradient(defs, "radialGradient", "gPetalBlush",
      { gradientUnits: "userSpaceOnUse", cx: 0, cy: 0, r: 72 },
      [["0%", "#ffb3cf", 0], ["55%", "#ffb3cf", 0], ["82%", "#ffa9c9", 0.35], ["100%", "#ff8fb8", 0.6]]);

    // Kawaii face: warm golden cheeks-and-all centre
    gradient(defs, "radialGradient", "gFace",
      { cx: "40%", cy: "35%", r: "70%" },
      [["0%", "#fff3b0"], ["55%", "#ffd75a"], ["100%", "#f2b42a"]]);

    // Soft halo behind each flower
    gradient(defs, "radialGradient", "gFlowerGlow", {},
      [["0%", "#fff0f6", 0.45], ["60%", "#ffd1e4", 0.12], ["100%", "#ffd1e4", 0]]);

    // Golden glow behind the stamen cluster
    gradient(defs, "radialGradient", "gStamenGlow", {},
      [["0%", "#ffd75a", 0.7], ["70%", "#f7c531", 0.15], ["100%", "#f7c531", 0]]);

    // Bud: creamy white, slightly shaded at the bottom
    gradient(defs, "radialGradient", "gBud",
      { cx: "40%", cy: "30%", r: "80%" },
      [["0%", "#ffffff"], ["60%", "#fbf3df"], ["100%", "#e6d8b4"]]);

    // Mature leaf: glossy green with a light edge along the top
    gradient(defs, "linearGradient", "gLeaf",
      { x1: "0", y1: "0", x2: "0", y2: "1" },
      [["0%", "#4f9a5c"], ["45%", "#2f6b3a"], ["100%", "#1d4527"]]);

    // Young leaf: Mesua's signature pink-red new growth
    gradient(defs, "linearGradient", "gLeafYoung",
      { x1: "0", y1: "0", x2: "0", y2: "1" },
      [["0%", "#f58aa3"], ["45%", "#d9466a"], ["100%", "#a12d4c"]]);

    return defs;
  }

  /* ---------- Flower parts ---------- */

  // Broad obovate petal with a softly wavy, notched tip — points "up" (−y)
  const PETAL_PATH =
    "M0 -6 C -24 -10, -43 -38, -28 -60 C -19 -71, -8 -65, 0 -70 " +
    "C 8 -65, 19 -71, 28 -60 C 43 -38, 24 -10, 0 -6 Z";

  const PETAL_VEINS = [
    "M0 -12 L0 -60",
    "M-2 -14 C -8 -30, -15 -44, -20 -56",
    "M2 -14 C 8 -30, 15 -44, 20 -56",
  ];

  function createPetal(parent, angle) {
    const g = el("g", { class: "petal", transform: `rotate(${angle})` }, parent);
    el("path", {
      d: PETAL_PATH,
      fill: "url(#gPetal)",
      stroke: "#f4c3d6",
      "stroke-width": 1.4,
      "stroke-linejoin": "round",
    }, g);
    // Pink blush toward the tip
    el("path", { d: PETAL_PATH, fill: "url(#gPetalBlush)" }, g);
    PETAL_VEINS.forEach((d) =>
      el("path", {
        d,
        fill: "none",
        stroke: "#f0c9d8",
        "stroke-width": 0.7,
        "stroke-linecap": "round",
        opacity: 0.6,
      }, g)
    );
    // Little glossy shine near the tip
    el("ellipse", {
      cx: -13, cy: -54, rx: 4, ry: 7.5,
      fill: "#ffffff",
      opacity: 0.85,
      transform: "rotate(-28 -13 -54)",
    }, g);
    el("circle", { cx: -6, cy: -62, r: 1.8, fill: "#ffffff", opacity: 0.9 }, g);
    return g;
  }

  /* ---------- Kawaii face (Part 12) ----------
     Sits on the golden centre. Starts asleep (closed eyes),
     wakes up with open sparkly eyes + smile when the flower blooms. */
  function createFace(parent) {
    const face = el("g", { class: "face" }, parent);
    el("circle", { r: 17, fill: "url(#gFace)", stroke: "#e9a21f", "stroke-width": 1 }, face);

    // Rosy cheeks
    el("ellipse", { cx: -9.5, cy: 4.5, rx: 3.8, ry: 2.4, fill: "#ff8fb1", opacity: 0.8 }, face);
    el("ellipse", { cx: 9.5, cy: 4.5, rx: 3.8, ry: 2.4, fill: "#ff8fb1", opacity: 0.8 }, face);

    const line = { fill: "none", stroke: "#5a3414", "stroke-width": 1.5, "stroke-linecap": "round" };

    // Asleep: ︶ ︶ eyes, tiny mouth
    const sleep = el("g", { class: "face__sleep" }, face);
    el("path", { d: "M-8.5 -2.5 Q -5.5 0.8 -2.5 -2.5", ...line }, sleep);
    el("path", { d: "M2.5 -2.5 Q 5.5 0.8 8.5 -2.5", ...line }, sleep);
    el("path", { d: "M-1.5 5.5 L1.5 5.5", ...line }, sleep);

    // Awake: shiny eyes that blink, happy smile
    const awake = el("g", { class: "face__awake", opacity: 0 }, face);
    const eyes = el("g", { class: "face__eyes", style: `--blink:${rand(3.5, 6).toFixed(1)}s;--blink-delay:${rand(-5, 0).toFixed(1)}s` }, awake);
    [-5.5, 5.5].forEach((x) => {
      el("ellipse", { cx: x, cy: -2, rx: 2.3, ry: 2.9, fill: "#3e220c" }, eyes);
      el("circle", { cx: x - 0.8, cy: -3.1, r: 0.95, fill: "#ffffff" }, eyes);
    });
    el("path", { d: "M-3.2 3.8 Q 0 7.4 3.2 3.8", ...line }, awake);

    return { face, sleep, awake };
  }

  // The famous golden pompom: many fine filaments tipped with anthers
  function createStamens(parent, count = 130) {
    const group = el("g", { class: "flower__stamens" }, parent);
    const stamens = [];

    // Longer ones first so shorter ones sit on top → dense, rounded look
    const specs = Array.from({ length: count }, () => ({
      angle: rand(0, 360),
      length: 12 + Math.sqrt(Math.random()) * 24,
    })).sort((a, b) => b.length - a.length);

    specs.forEach(({ angle, length }, i) => {
      const s = el("g", { class: "stamen", transform: `rotate(${angle.toFixed(1)})` }, group);
      const bend = rand(-3, 3);
      el("path", {
        d: `M0 0 Q ${bend} ${(-length / 2).toFixed(1)} 0 ${(-length).toFixed(1)}`,
        fill: "none",
        stroke: i % 3 === 0 ? "#e09a12" : "#f7c531",
        "stroke-width": 0.9,
        "stroke-linecap": "round",
      }, s);
      el("circle", {
        class: "stamen__anther",
        cx: 0,
        cy: (-length).toFixed(1),
        r: rand(1.5, 2.4).toFixed(2),
        fill: i % 4 === 0 ? "#e09a12" : "#fff1a8",
      }, s);
      stamens.push(s);
    });

    return { group, stamens };
  }

  function createFlower(parent, { stamens: stamenCount = 130 } = {}) {
    const root = el("g", { class: "flower" }, parent);
    // Inner body gets the squishy "jelly" bounce; root is free for wind nodding
    const body = el("g", { class: "flower__body" }, root);

    const glow = el("circle", { class: "flower__glow", r: 100, fill: "url(#gFlowerGlow)" }, body);

    // 4 small green sepals peeking out between petals
    const sepals = el("g", { class: "flower__sepals" }, body);
    for (let i = 0; i < 4; i++) {
      el("ellipse", {
        cx: 0, cy: -20, rx: 9, ry: 20,
        fill: "#4d7a3a",
        transform: `rotate(${i * 90 + 45})`,
      }, sepals);
    }

    // 4 petals, slightly irregular like a real flower
    const petalGroup = el("g", { class: "flower__petals" }, body);
    const offset = rand(0, 90);
    const petals = [0, 1, 2, 3].map((i) =>
      createPetal(petalGroup, i * 90 + offset + rand(-6, 6))
    );

    const stamenGlow = el("circle", { class: "flower__stamen-glow", r: 42, fill: "url(#gStamenGlow)" }, body);
    const { group: stamenGroup, stamens } = createStamens(body, stamenCount);

    // The centre is a little face (it pops in where the pistil used to be)
    const { face: pistil, sleep, awake } = createFace(body);

    return { root, body, glow, sepals, petals, stamenGlow, stamenGroup, stamens, pistil, face: { sleep, awake } };
  }

  // Closed bud: creamy oval cupped by two green sepals, base at (0,0)
  function createBud(parent) {
    const root = el("g", { class: "bud" }, parent);
    el("ellipse", { class: "bud__body", cx: 0, cy: -18, rx: 13, ry: 19, fill: "url(#gBud)" }, root);
    const sepalPath = "M0 2 C -17 -2, -19 -20, -7 -30 C -10 -18, -6 -7, 0 2 Z";
    el("path", { class: "bud__sepal", d: sepalPath, fill: "#4d7a3a" }, root);
    el("path", { class: "bud__sepal", d: sepalPath, fill: "#3d6a2e", transform: "scale(-1,1)" }, root);
    // Pink blushing tip + shine
    el("ellipse", { cx: 0, cy: -31, rx: 8, ry: 6, fill: "#ffb3cf", opacity: 0.55 }, root);
    el("ellipse", { cx: -4, cy: -27, rx: 3, ry: 5, fill: "#ffffff", opacity: 0.75 }, root);
    return root;
  }

  /* ---------- Foreground: grass tufts + baby flowers (Part 12) ----------
     Each item: <g translate> → <g .fore-item> (grows in) → <g .fore-sway> (sways) */
  function createForeground(parent, { width, top, bottom, small }) {
    const fore = el("g", { class: "garden__fore" }, parent);
    const tufts = Math.round(width / (small ? 20 : 26));
    const babies = Math.round(width / (small ? 34 : 48));
    const items = [];

    const holder = (x, y) => {
      const pos = el("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, fore);
      const item = el("g", { class: "fore-item", style: `--d:${rand(0, 1.6).toFixed(2)}s` }, pos);
      const sway = el("g", {
        class: "fore-sway",
        style: `--sd:${rand(2.2, 3.6).toFixed(2)}s;--sdelay:${rand(-3, 0).toFixed(2)}s`,
      }, item);
      items.push({ y, pos });
      return sway;
    };

    const greens = ["#5fae6b", "#4a9a58", "#7cc28a", "#3f8a4c"];
    for (let i = 0; i < tufts; i++) {
      const x = (i + rand(0.1, 0.9)) * (width / tufts);
      const g = holder(x, rand(top, bottom));
      const blades = 4 + ((Math.random() * 3) | 0);
      for (let b = 0; b < blades; b++) {
        const h = rand(16, 32) * (small ? 1 : 1.2);
        const lean = rand(-9, 9);
        const bx = rand(-6, 6);
        el("path", {
          d: `M${bx - 2} 0 Q ${bx + lean * 0.4} ${-h * 0.6} ${bx + lean} ${-h} Q ${bx + lean * 0.3} ${-h * 0.5} ${bx + 2} 0 Z`,
          fill: greens[(Math.random() * greens.length) | 0],
        }, g);
      }
    }

    const petalColors = ["#ffc1d9", "#ffffff", "#e8cfff", "#ffd6e7"];
    for (let i = 0; i < babies; i++) {
      const x = (i + rand(0.15, 0.85)) * (width / babies);
      const g = holder(x, rand(top + 6, bottom));
      const h = rand(12, 24);
      el("path", { d: `M0 0 Q ${rand(-3, 3)} ${-h / 2} 0 ${-h}`, fill: "none", stroke: "#4a9a58", "stroke-width": 1.4 }, g);
      const head = el("g", { transform: `translate(0 ${-h}) scale(${rand(1, 1.4).toFixed(2)})` }, g);
      const color = petalColors[(Math.random() * petalColors.length) | 0];
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        el("circle", { cx: (Math.cos(a) * 3.6).toFixed(2), cy: (Math.sin(a) * 3.6).toFixed(2), r: 2.9, fill: color }, head);
      }
      el("circle", { r: 2.1, fill: "#ffd75a" }, head);
    }

    // Draw nearer (lower) items last so they overlap correctly
    items.sort((a, b) => a.y - b.y).forEach(({ pos }) => fore.appendChild(pos));
    return fore;
  }

  // Long, narrow lanceolate leaf drawn from base (0,0) along +x.
  // Every leaf has a pink "young" layer on top: mature leaves fade it out
  // as they grow (Part 4), the top pair keeps it.
  function createLeaf(parent, { length, width, young, x, y, angle, side, t }) {
    const g = el("g", {
      class: young ? "leaf leaf--young" : "leaf",
      transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`,
    }, parent);
    // Inner group is what animates (scale/rotate around the leaf base)
    const blade = el("g", { class: "leaf__blade" }, g);
    const L = length, W = width;
    const d =
      `M0 0 C ${L * 0.25} ${-W}, ${L * 0.7} ${-W * 0.9}, ${L} 0 ` +
      `C ${L * 0.7} ${W * 0.9}, ${L * 0.25} ${W}, 0 0 Z`;
    el("path", { d, fill: "url(#gLeaf)" }, blade);
    const tint = el("path", { class: "leaf__tint", d, fill: "url(#gLeafYoung)" }, blade);
    if (!young) tint.setAttribute("opacity", 0);
    el("path", {
      d: `M0 0 Q ${L * 0.5} ${-W * 0.12} ${L * 0.96} 0`,
      fill: "none",
      stroke: young ? "#ffc2cf" : "#8cc79a",
      "stroke-width": 0.6,
      opacity: 0.6,
    }, blade);
    return { el: g, blade, tint, young, side, t };
  }

  /* ---------- Cubic Bézier helpers (for placing leaves on the stem) ---------- */
  function bezierPoint(p, t) {
    const u = 1 - t;
    return {
      x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
      y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
    };
  }

  function bezierAngle(p, t) {
    const u = 1 - t;
    const dx = 3 * u * u * (p[1].x - p[0].x) + 6 * u * t * (p[2].x - p[1].x) + 3 * t * t * (p[3].x - p[2].x);
    const dy = 3 * u * u * (p[1].y - p[0].y) + 6 * u * t * (p[2].y - p[1].y) + 3 * t * t * (p[3].y - p[2].y);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  /* ---------- Whole plant ---------- */
  /**
   * @param {SVGElement} parent
   * @param {object} o
   * @param {number} o.x, o.y   base position (on the ground)
   * @param {number} o.height   stem height in px
   * @param {number} o.scale    overall size (1 ≈ iPhone 12 mini front flower)
   * @param {"flower"|"bud"} o.kind
   * @param {"front"|"back"} o.depth
   * @param {number} [o.lean]  -1 / 1 forces the stem to lean left / right (0 = random)
   */
  function createPlant(parent, o) {
    const { x, y, height, scale = 1, kind = "flower", depth = "front", lean = 0 } = o;
    const root = el("g", {
      class: `plant plant--${kind} plant--${depth}`,
      transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`,
    }, parent);

    // Wind rotates this group around the plant's base (Part 6)
    const sway = el("g", { class: "plant__sway" }, root);

    // Gentle S-curve stem leaning slightly left or right
    const bend = (lean ? lean * rand(0.02, 0.07) : rand(-0.08, 0.08)) * height;
    const pts = [
      { x: 0, y: 0 },
      { x: rand(-0.08, 0.08) * height, y: -height * 0.35 },
      { x: bend * 0.9, y: -height * 0.72 },
      { x: bend, y: -height },
    ];

    const stem = el("path", {
      class: "stem",
      d: `M${pts[0].x} ${pts[0].y} C ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}, ` +
         `${pts[2].x.toFixed(1)} ${pts[2].y.toFixed(1)}, ${pts[3].x.toFixed(1)} ${pts[3].y.toFixed(1)}`,
      fill: "none",
      stroke: "#3d5a2a",
      "stroke-width": (3 * scale).toFixed(2),
      "stroke-linecap": "round",
    }, sway);

    // Opposite leaf pairs; the top pair is young (pink-red) growth
    const leafGroup = el("g", { class: "plant__leaves" }, sway);
    const leaves = [];
    const stops = [0.28, 0.48, 0.66, 0.84];
    stops.forEach((t, i) => {
      const p = bezierPoint(pts, t);
      const stemAngle = bezierAngle(pts, t);
      const young = i === stops.length - 1;
      const size = young ? 0.75 : 1 - i * 0.06;
      [-1, 1].forEach((side) => {
        leaves.push(createLeaf(leafGroup, {
          x: p.x,
          y: p.y,
          angle: stemAngle + side * rand(young ? 40 : 70, young ? 60 : 105),
          length: 46 * scale * size,
          width: 8 * scale * size,
          young,
          side,
          t,
        }));
      });
    });

    // Flower head at the tip of the stem
    const headScale = 0.62 * scale;
    const head = el("g", {
      class: "plant__head",
      transform: `translate(${pts[3].x.toFixed(1)} ${pts[3].y.toFixed(1)}) ` +
                 `rotate(${rand(-12, 12).toFixed(1)}) scale(${headScale.toFixed(3)})`,
    }, sway);

    // Inner group scales around the stem tip (0,0) when the bud pops out
    const headInner = el("g", { class: "plant__head-inner" }, head);
    const bud = createBud(headInner);
    const flower = kind === "flower" ? createFlower(headInner) : null;

    // Plants start as buds; Part 5 animates bud → flower
    if (flower) flower.root.setAttribute("opacity", 0);

    return { root, sway, stem, leaves, head, headInner, bud, flower, kind, depth, scale, height, x };
  }

  window.MesuaFlower = { NS, el, addDefs, createPlant, createFlower, createBud, createForeground };
})();
