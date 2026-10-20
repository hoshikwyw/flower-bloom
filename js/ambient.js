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
    sprite: null,

    init(canvas, plants) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.sprite = makeGlowSprite(64, "rgba(255, 250, 210, 1)", "rgba(255, 226, 122, 0.45)");
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
      };
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

    // Little explosion of hearts + golden sparkles at a tap
    burst(x, y) {
      const n = this.small ? 10 : 14;
      for (let i = 0; i < n; i++) {
        const a = rand(0, TAU);
        const speed = rand(40, 120);
        this.bursts.push({
          x, y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - 40,
          life: 0,
          maxLife: rand(0.9, 1.6),
          heart: i % 3 === 0,
          size: rand(0.5, 0.9),
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
    },

    draw(t) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      this.drawBursts();
      if (!this.particlesOn || this.fade <= 0) return;

      // Fireflies + pollen glow additively
      ctx.globalCompositeOperation = "lighter";
      for (const f of this.fireflies) {
        const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(t * f.blink + f.phase));
        ctx.globalAlpha = pulse * this.fade;
        ctx.drawImage(this.sprite, f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
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
      ctx.globalAlpha = 1;
    },

    loop(now) {
      if (!this.running) return;
      const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0.016;
      this.last = now;
      this.time += dt;

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
