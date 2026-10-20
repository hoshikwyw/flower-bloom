/* =========================================================
   Part 6 — Ambient motion
   • Wind: plants sway from their base, flowers nod, leaves flutter,
     with an occasional soft gust
   • Canvas particles: glowing fireflies, golden pollen rising
     from the flowers, white Mesua petals drifting down
   One requestAnimationFrame loop drives everything.
   ========================================================= */

(() => {
  "use strict";

  const rand = (min, max) => Math.random() * (max - min) + min;
  const TAU = Math.PI * 2;

  // Same petal outline as the SVG flower, scaled down for the canvas
  const PETAL = new Path2D(
    "M0 -6 C -24 -10, -43 -38, -28 -60 C -19 -71, -8 -65, 0 -70 " +
    "C 8 -65, 19 -71, 28 -60 C 43 -38, 24 -10, 0 -6 Z"
  );

  // Small heart for tap bursts (≈ 20 units wide, centred)
  const HEART = new Path2D(
    "M0 6 C -2 3, -10 -1, -10 -6 C -10 -10, -6 -12, -3 -11 C -1.5 -10.5, -0.5 -9.5, 0 -8 " +
    "C 0.5 -9.5, 1.5 -10.5, 3 -11 C 6 -12, 10 -10, 10 -6 C 10 -1, 2 3, 0 6 Z"
  );

  // Pre-rendered soft glow sprite (much cheaper than shadowBlur per frame)
  function makeGlowSprite(size, inner, outer) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.25, outer);
    grad.addColorStop(1, "rgba(255, 226, 122, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  // Pre-rendered glowing heart (Part 13): heart fireflies + soft heart bokeh
  function makeHeartSprite(size, fill, glow, blur) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const k = (size * 0.55) / 20; // HEART is ~20 units wide
    g.translate(size / 2, size / 2 + 3 * k);
    g.scale(k, k);
    g.shadowColor = glow;
    g.shadowBlur = blur;
    g.fillStyle = fill;
    g.fill(HEART);
    g.fill(HEART); // second pass = stronger glow
    return c;
  }

  /* ---------- Butterflies (Part 13) ---------- */
  const BUTTERFLY_COLORS = [
    ["#ffb3d1", "#ff7fae"],
    ["#dcc2ff", "#a77bf0"],
    ["#ffd9a8", "#ffaa6b"],
  ];

  // Wing shapes in "butterfly units" (body along y, right side; mirrored for left)
  const WING_UP = new Path2D("M0 -1 C 3 -13, 15 -15, 14 -5 C 13.5 -1, 7 1, 0 0 Z");
  const WING_LOW = new Path2D("M0 1 C 4 2, 11 4, 9 10 C 7 14, 2 9, 0 2 Z");

  const ambient = {
    plants: [],
    canvas: null,
    ctx: null,
    w: 0,
    h: 0,
    dpr: 1,
    small: true,
    time: 0,
    last: 0,
    running: false,
    particlesOn: false,
    fade: 0,              // particle layer fades in after the bloom
    leavesReady: false,   // leaf flutter starts once growth has finished
    flowersReady: false,  // flower nod starts once bloom has finished
    wind: { gust: 0 },
    fireflies: [],
    pollen: [],
    petals: [],
    bursts: [],           // hearts + sparkles from taps (Part 8)
    pointer: null,        // last pointer position, for pushing plants (Part 8)
    bokeh: [],            // big soft hearts rising slowly (Part 13)
    butterflies: [],      // (Part 13)
    sprite: null,

    init(canvas, plants) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.sprite = makeGlowSprite(64, "rgba(255, 250, 210, 1)", "rgba(255, 226, 122, 0.45)");
      this.heartSprite = makeHeartSprite(64, "#ffe0ec", "rgba(255, 120, 170, 1)", 14);
      this.bokehSprite = makeHeartSprite(96, "rgba(255, 196, 220, 0.55)", "rgba(255, 170, 205, 0.9)", 22);
      this.setPlants(plants);
      this.resize();
      window.addEventListener("resize", () => this.resize(), { passive: true });
      document.addEventListener("visibilitychange", () => {
        this.last = 0; // avoid a huge jump after returning to the tab
      });
    },

    setPlants(plants) {
      this.plants = plants;
      plants.forEach((p) => {
        p.swayPhase = rand(0, TAU);
        p.push = 0;
        p.leaves.forEach((l) => (l.phase = rand(0, TAU)));
      });
    },

    resize() {
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.small = this.w <= 500;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    },

    /* ---------- Wind ---------- */

    // Smooth layered breeze in roughly −1…1, plus gusts
    windAt(t) {
      return Math.sin(t * 0.55) * 0.5 + Math.sin(t * 0.23 + 1.7) * 0.35 + this.wind.gust;
    },

    scheduleGusts() {
      const next = () => {
        gsap.delayedCall(rand(6, 12), () => {
          gsap.timeline()
            .to(this.wind, { gust: rand(0.7, 1.1), duration: 1.4, ease: "sine.inOut" })
            .to(this.wind, { gust: 0, duration: 2.6, ease: "sine.inOut" });
          next();
        });
      };
      next();
    },

    /* ---------- Touch / hover push ---------- */

    // Called on pointermove: flowers near the finger/mouse get nudged
    // in the direction it moves, then spring back.
    nudge(x, y) {
      const prev = this.pointer;
      this.pointer = { x, y };
      if (!prev) return;
      const dx = x - prev.x;
      if (Math.abs(dx) < 0.5) return;
      for (const { plant: p, head } of this.measure()) {
        const reach = Math.max(70, head.size);
        const dist = Math.hypot(x - head.x, y - head.y);
        if (dist < reach) {
          const k = 1 - dist / reach;
          p.push = Math.max(-9, Math.min(9, p.push + dx * 0.12 * k));
        }
      }
    },

    updatePlants(t, wind, dt) {
      const decay = Math.pow(0.04, dt); // push fades to ~4% in a second
      for (const p of this.plants) {
        const depth = p.depth === "back" ? 0.7 : 1;
        p.push *= decay;
        const angle = (wind * 1.6 + Math.sin(t * 1.3 + p.swayPhase) * 0.7) * depth + p.push;
        p.sway.setAttribute("transform", `rotate(${angle.toFixed(2)})`);

        if (this.leavesReady) {
          for (const l of p.leaves) {
            const flutter = Math.sin(t * 2.4 + l.phase) * (2 + Math.abs(wind) * 3);
            l.blade.setAttribute("transform", `rotate(${flutter.toFixed(2)})`);
          }
        }

        if (this.flowersReady && p.flower) {
          const nod = Math.sin(t * 0.9 + p.swayPhase) * 4 + wind * 3;
          p.flower.root.setAttribute("transform", `rotate(${nod.toFixed(2)})`);
        }
      }
    },

    /* ---------- Particles ---------- */

    // Screen positions of flower heads, cached for 0.3s.
    // Reading layout every frame (right after we write transforms) is slow on phones.
    measure() {
      if (this.cache && this.time - this.cache.at < 0.3 && this.cache.plants === this.plants) {
        return this.cache.items;
      }
      const items = this.plants.map((plant) => {
        const r = plant.head.getBoundingClientRect();
        const head = { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.width };
        let center = null;
        if (plant.flower) {
          const s = plant.flower.stamenGlow.getBoundingClientRect();
          center = { x: s.left + s.width / 2, y: s.top + s.height / 2, r: s.width / 3 };
        }
        return { plant, head, center };
      });
      this.cache = { at: this.time, plants: this.plants, items };
      return items;
    },

    // Centres of bloomed flowers in screen pixels (pollen comes from here)
    flowerCenters() {
      return this.measure().filter((m) => m.center).map((m) => m.center);
    },

    makeFirefly() {
      return {
        x: rand(0, this.w),
        y: rand(this.h * 0.35, this.h * 0.95),
        dir: rand(0, TAU),
        speed: rand(10, 24),            // px per second
        size: rand(16, 28),
        phase: rand(0, TAU),
        blink: rand(0.8, 1.6),
        heart: Math.random() < 0.35,   // some fireflies glow as tiny hearts 💗
      };
    },

    /* ---------- Heart bokeh ---------- */
    spawnBokeh(initial) {
      this.bokeh.push({
        x: rand(0, this.w),
        y: initial ? rand(this.h * 0.2, this.h) : this.h + 40,
        vy: rand(-16, -7),
        size: rand(18, 42) * (this.small ? 1 : 1.3),
        alpha: rand(0.25, 0.5),
        phase: rand(0, TAU),
        sway: rand(10, 26),
        baseX: 0,
      });
      const b = this.bokeh[this.bokeh.length - 1];
      b.baseX = b.x;
    },

    /* ---------- Butterflies ---------- */
    makeButterfly(i) {
      const [wing, edge] = BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length];
      return {
        x: rand(0.1, 0.9) * this.w,
        y: rand(0.45, 0.7) * this.h,
        vx: 0,
        vy: 0,
        target: null,
        state: "fly",           // "fly" | "land"
        timer: rand(2, 4),
        landOn: null,           // flower index while landed
        size: rand(1.05, 1.3) * (this.small ? 1 : 1.25),
        phase: rand(0, TAU),
        wing,
        edge,
      };
    },

    pickTarget(b) {
      const centers = this.flowerCenters();
      // ~45% chance to go land on a flower, otherwise wander the lower sky
      if (centers.length && Math.random() < 0.45) {
        b.landOn = (Math.random() * centers.length) | 0;
        b.target = null;
      } else {
        b.landOn = null;
        b.target = { x: rand(0.08, 0.92) * this.w, y: rand(0.38, 0.8) * this.h };
      }
      b.timer = rand(3, 6);
    },

    updateButterflies(dt, t) {
      const centers = this.flowerCenters();
      for (const b of this.butterflies) {
        b.timer -= dt;

        // Where are we heading? A flower (sitting just on its petals) or a wander point
        let tx, ty;
        if (b.landOn !== null && centers[b.landOn]) {
          const c = centers[b.landOn];
          tx = c.x + c.r * 0.6;
          ty = c.y - c.r * 1.2;
        } else if (b.target) {
          tx = b.target.x;
          ty = b.target.y;
        } else {
          this.pickTarget(b);
          continue;
        }

        const dx = tx - b.x;
        const dy = ty - b.y;
        const dist = Math.hypot(dx, dy);

        if (b.state === "land") {
          // Ride along with the swaying flower
          b.x += dx * Math.min(1, dt * 8);
          b.y += dy * Math.min(1, dt * 8);
          if (b.timer <= 0) {
            // Take off upward and wander a bit before choosing another flower
            b.state = "fly";
            b.vy = -60;
            b.landOn = null;
            b.target = { x: rand(0.08, 0.92) * this.w, y: rand(0.38, 0.65) * this.h };
            b.timer = rand(2, 4);
          }
          continue;
        }

        // Flying: ease toward the target, with a fluttery bob
        const speed = 55;
        const desiredX = dist > 1 ? (dx / dist) * speed : 0;
        const desiredY = dist > 1 ? (dy / dist) * speed : 0;
        const k = Math.min(1, dt * 2.2);
        b.vx += (desiredX - b.vx) * k;
        b.vy += (desiredY - b.vy) * k;
        b.x += b.vx * dt;
        b.y += b.vy * dt + Math.sin(t * 6 + b.phase) * 0.6;

        if (b.landOn !== null && dist < 6) {
          b.state = "land";
          b.timer = rand(3, 6);
          b.vx = b.vy = 0;
        } else if (b.landOn === null && (dist < 12 || b.timer <= 0)) {
          this.pickTarget(b);
        }
      }
    },

    drawButterfly(b, t) {
      const ctx = this.ctx;
      const landed = b.state === "land";
      // Wings flap fast in flight, slow open/close when resting on a flower
      const flap = landed
        ? 0.35 + 0.65 * Math.abs(Math.sin(t * 2.2 + b.phase))
        : 0.2 + 0.8 * Math.abs(Math.sin(t * 15 + b.phase));
      const tilt = landed ? -0.15 : Math.max(-0.5, Math.min(0.5, b.vx * 0.008));

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(tilt);
      ctx.scale(b.size, b.size);
      ctx.globalAlpha = this.fade;

      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side * flap, 1);
        ctx.fillStyle = b.wing;
        ctx.strokeStyle = b.edge;
        ctx.lineWidth = 1.2;
        ctx.fill(WING_UP);
        ctx.stroke(WING_UP);
        ctx.fill(WING_LOW);
        ctx.stroke(WING_LOW);
        // White polka dots
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(9, -7, 1.8, 0, TAU);
        ctx.arc(5, 5, 1.3, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // Body + antennae
      ctx.fillStyle = "#5b3a6e";
      ctx.beginPath();
      ctx.ellipse(0, 1, 1.5, 6.5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#5b3a6e";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-0.5, -5);
      ctx.quadraticCurveTo(-3, -10, -4.5, -11);
      ctx.moveTo(0.5, -5);
      ctx.quadraticCurveTo(3, -10, 4.5, -11);
      ctx.stroke();
      ctx.restore();
    },

    spawnPollen() {
      const centers = this.flowerCenters();
      if (!centers.length) return;
      const c = centers[(Math.random() * centers.length) | 0];
      this.pollen.push({
        x: c.x + rand(-c.r, c.r),
        y: c.y + rand(-c.r, c.r),
        vx: rand(-6, 6),
        vy: rand(-22, -8),
        life: 0,
        maxLife: rand(3.5, 6.5),
        size: rand(0.8, 1.8),
      });
    },

    spawnPetal() {
      this.petals.push({
        x: rand(-0.1, 1) * this.w,
        y: -20,
        vy: rand(18, 34),
        swayAmp: rand(18, 40),
        swaySpeed: rand(0.8, 1.6),
        phase: rand(0, TAU),
        rot: rand(0, TAU),
        spin: rand(-1.2, 1.2),
        flip: rand(0, TAU),
        scale: rand(0.15, 0.22) * (this.small ? 1 : 1.25),
        baseX: 0,
      });
      const p = this.petals[this.petals.length - 1];
      p.baseX = p.x;
    },

    // Little explosion of hearts + golden sparkles at a tap.
    // Bigger options make heart fireworks (Part 14).
    burst(x, y, { count, speed = [40, 120], hearts = 0.34 } = {}) {
      const n = count || (this.small ? 10 : 14);
      const big = n > 20;
      for (let i = 0; i < n; i++) {
        // Fireworks spread evenly in a ring; taps scatter randomly
        const a = big ? (i / n) * TAU + rand(-0.1, 0.1) : rand(0, TAU);
        const v = rand(speed[0], speed[1]);
        this.bursts.push({
          x, y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 40,
          life: 0,
          maxLife: rand(0.9, 1.6) * (big ? 1.3 : 1),
          heart: Math.random() < hearts,
          size: rand(0.5, 0.9) * (big ? 1.3 : 1),
          rot: rand(-0.4, 0.4),
        });
      }
    },

    updateBursts(dt) {
      for (const b of this.bursts) {
        b.life += dt;
        b.vx *= Math.pow(0.15, dt);
        b.vy = b.vy * Math.pow(0.15, dt) - 30 * dt; // hearts float upward
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      this.bursts = this.bursts.filter((b) => b.life < b.maxLife);
    },

    drawBursts() {
      const ctx = this.ctx;
      for (const b of this.bursts) {
        const k = b.life / b.maxLife;
        const alpha = 1 - k * k;
        if (b.heart) {
          ctx.globalCompositeOperation = "source-over";
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          ctx.scale(b.size, b.size);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#ff8fb1";
          ctx.fill(HEART);
          ctx.restore();
        } else {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = alpha;
          const s = 18 * (1 - k * 0.5);
          ctx.drawImage(this.sprite, b.x - s / 2, b.y - s / 2, s, s);
        }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    },

    updateParticles(dt, t, wind) {
      const maxFireflies = this.small ? 14 : 26;
      const maxPollen = this.small ? 26 : 45;
      const maxPetals = this.small ? 6 : 11;

      while (this.fireflies.length < maxFireflies) this.fireflies.push(this.makeFirefly());
      if (this.pollen.length < maxPollen && Math.random() < dt * 6) this.spawnPollen();
      if (this.petals.length < maxPetals && Math.random() < dt * 0.6) this.spawnPetal();

      // Fireflies wander with a slowly turning heading
      for (const f of this.fireflies) {
        f.dir += rand(-1.5, 1.5) * dt;
        f.x += Math.cos(f.dir) * f.speed * dt + wind * 6 * dt;
        f.y += Math.sin(f.dir) * f.speed * dt * 0.6;
        // Wrap horizontally, steer back vertically
        if (f.x < -20) f.x = this.w + 20;
        if (f.x > this.w + 20) f.x = -20;
        if (f.y < this.h * 0.3) f.dir = Math.abs(f.dir) % Math.PI;          // head down
        if (f.y > this.h * 0.97) f.dir = -(Math.abs(f.dir) % Math.PI);      // head up
      }

      // Pollen floats up and drifts with the wind
      for (const p of this.pollen) {
        p.life += dt;
        p.x += (p.vx + wind * 14) * dt;
        p.y += p.vy * dt;
      }
      this.pollen = this.pollen.filter((p) => p.life < p.maxLife);

      // Petals tumble down, swaying side to side
      for (const p of this.petals) {
        p.y += p.vy * dt;
        p.baseX += wind * 22 * dt;
        p.x = p.baseX + Math.sin(t * p.swaySpeed + p.phase) * p.swayAmp;
        p.rot += p.spin * dt;
        p.flip += dt * 2.2;
      }
      this.petals = this.petals.filter((p) => p.y < this.h + 30);

      // Soft heart bokeh rises slowly from the bottom
      const maxBokeh = this.small ? 6 : 10;
      if (!this.bokeh.length) for (let i = 0; i < maxBokeh; i++) this.spawnBokeh(true);
      else if (this.bokeh.length < maxBokeh && Math.random() < dt * 0.5) this.spawnBokeh(false);
      for (const b of this.bokeh) {
        b.y += b.vy * dt;
        b.baseX += wind * 8 * dt;
        b.x = b.baseX + Math.sin(t * 0.5 + b.phase) * b.sway;
      }
      this.bokeh = this.bokeh.filter((b) => b.y > -60);

      // Butterflies
      const maxButterflies = this.small ? 2 : 3;
      while (this.butterflies.length < maxButterflies) {
        this.butterflies.push(this.makeButterfly(this.butterflies.length));
      }
      this.updateButterflies(dt, t);
    },

    draw(t) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      this.drawBursts();
      if (!this.particlesOn || this.fade <= 0) return;

      // Big soft hearts drifting in the back, gently pulsing
      for (const b of this.bokeh) {
        const fadeEdge = Math.min(1, (this.h + 40 - b.y) / 120, (b.y + 60) / 160);
        ctx.globalAlpha = b.alpha * (0.75 + 0.25 * Math.sin(t * 1.2 + b.phase)) * fadeEdge * this.fade;
        ctx.drawImage(this.bokehSprite, b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
      }

      // Fireflies + pollen glow additively (some fireflies are little hearts)
      ctx.globalCompositeOperation = "lighter";
      for (const f of this.fireflies) {
        const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(t * f.blink + f.phase));
        ctx.globalAlpha = pulse * this.fade;
        if (f.heart) {
          const s = f.size * 0.85;
          ctx.drawImage(this.heartSprite, f.x - s / 2, f.y - s / 2, s, s);
        } else {
          ctx.drawImage(this.sprite, f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
        }
      }

      ctx.fillStyle = "#ffd75a";
      for (const p of this.pollen) {
        const k = p.life / p.maxLife;
        ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9 * this.fade; // fade in & out
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }

      // Petals are solid white with soft cream shading
      ctx.globalCompositeOperation = "source-over";
      for (const p of this.petals) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(p.scale, p.scale * Math.cos(p.flip)); // tumbling 3D flip
        ctx.globalAlpha = 0.85 * this.fade;
        ctx.fillStyle = Math.cos(p.flip) > 0 ? "#fffdf7" : "#efe4c8";
        ctx.fill(PETAL);
        ctx.restore();
      }

      for (const b of this.butterflies) this.drawButterfly(b, t);
      ctx.globalAlpha = 1;

      // Part 15: the giant petal heart
      if (window.Finale && window.Finale.active) window.Finale.render(ctx, this.dt || 0.016);
    },

    loop(now) {
      if (!this.running) return;
      const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0.016;
      this.last = now;
      this.time += dt;
      this.dt = dt;

      const t = this.time;
      const wind = this.windAt(t);
      this.updatePlants(t, wind, dt);

      if (this.particlesOn) this.updateParticles(dt, t, wind);
      this.updateBursts(dt);
      if (this.particlesOn || this.bursts.length || this.hadBursts) this.draw(t);
      this.hadBursts = this.bursts.length > 0; // one extra frame clears the last burst

      requestAnimationFrame((n) => this.loop(n));
    },

    // Wind starts right away (plants sway while growing)
    start() {
      if (this.running) return;
      this.running = true;
      if (window.gsap) this.scheduleGusts();
      requestAnimationFrame((n) => this.loop(n));
    },

    // Fireflies, pollen and petals fade in after the bloom
    startParticles() {
      this.particlesOn = true;
      this.leavesReady = true;
      this.flowersReady = true;
      if (window.gsap) gsap.to(this, { fade: 1, duration: 3, ease: "sine.inOut" });
      else this.fade = 1;
    },
  };

  window.Ambient = ambient;
})();
