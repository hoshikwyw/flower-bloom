/* =========================================================
   Part 15 — Grand finale 💗
   Petals pop out of every flower → swirl in a big spiral around
   her name → land on the heart constellation → one giant
   petal heart that keeps beating (lub-dub) with a soft glow.
   Drawn on the particles canvas, called from Ambient.draw().
   ========================================================= */

(() => {
  "use strict";

  const rand = (min, max) => Math.random() * (max - min) + min;
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

  // Same petal outline as the flowers
  const PETAL = new Path2D(
    "M0 -6 C -24 -10, -43 -38, -28 -60 C -19 -71, -8 -65, 0 -70 " +
    "C 8 -65, 19 -71, 28 -60 C 43 -38, 24 -10, 0 -6 Z"
  );
  const COLORS = ["#ffffff", "#fff0f6", "#ffe0ec", "#ffd0e2", "#ffc2d9"];

  // Phase lengths (seconds)
  const POP = 0.6;    // burst out of the flower
  const SWIRL = 2.6;  // spiral around her name
  const FORM = 1.5;   // settle onto the heart

  // Heartbeat shape: a strong "lub" then a softer "dub"
  const heartbeat = (t) => {
    const p = (t % 1.3) / 1.3;
    return Math.exp(-Math.pow(p / 0.055, 2)) + 0.6 * Math.exp(-Math.pow((p - 0.2) / 0.055, 2));
  };

  // Petals must never sit on top of her name or the message
  function avoidName(points) {
    const rects = window.Love ? window.Love.textRects() : [];
    const pad = 8;
    return points.filter((p) => !rects.some((r) =>
      p.x > r.left - pad && p.x < r.right + pad && p.y > r.top - pad && p.y < r.bottom + pad));
  }

  const finale = {
    active: false,
    t: 0,
    petals: [],
    box: null,
    formedAt: 0,
    celebrated: false,

    start() {
      const A = window.Ambient;
      const L = window.Love;
      if (this.active || !A || !A.running || !L) return;
      const box = L.frame();
      if (!box) return;

      const small = window.innerWidth <= 500;
      const total = small ? 84 : 124;
      // Two rows (outer + slightly inner) make a thick, lush heart outline
      const targets = avoidName([
        ...L.heartPoints(Math.round(total * 0.62), 1, box),
        ...L.heartPoints(Math.round(total * 0.38), 0.91, box),
      ]);

      // Petals come out of the bloomed flowers (or the bottom if none)
      let sources = A.flowerCenters();
      if (!sources.length) sources = [{ x: box.cx, y: window.innerHeight, r: 30 }];

      const C = { x: box.cx, y: box.cy };
      const orbit = Math.min(box.width, box.height) * 0.5;

      this.petals = targets.map((tg, i) => {
        const src = sources[i % sources.length];
        const sx = src.x + rand(-src.r, src.r) * 0.5;
        const sy = src.y + rand(-src.r, src.r) * 0.5;
        const out = rand(30, 70);
        const a = rand(0, Math.PI * 2);
        const ax = sx + Math.cos(a) * out;
        const ay = sy + Math.sin(a) * out - 30;
        return {
          sx, sy, ax, ay,
          theta0: Math.atan2(ay - C.y, ax - C.x),
          r0: Math.hypot(ax - C.x, ay - C.y),
          rOrbit: orbit * rand(0.75, 1.25),
          spin: (Math.random() < 0.5 ? -1 : 1) * rand(Math.PI * 2, Math.PI * 3),
          tx: tg.x,
          ty: tg.y,
          tAngle: tg.angle + rand(-0.25, 0.25),
          rot0: rand(0, Math.PI * 2),
          spinRate: rand(2, 4),
          delay: rand(0, 0.9),
          color: COLORS[(Math.random() * COLORS.length) | 0],
          size: rand(0.17, 0.22) * (small ? 1 : 1.25),
          flip: rand(0, Math.PI * 2),
        };
      });

      this.box = box;
      this.C = C;
      this.t = 0;
      this.formedAt = 0.9 + POP + SWIRL + FORM;
      this.celebrated = false;
      this.active = true;
    },

    // Position + rotation of one petal at time t
    place(p, t) {
      const C = this.C;
      const tau = t - p.delay;
      if (tau < 0) return null;

      const swirlPos = (k) => {
        const th = p.theta0 + p.spin * k;
        const r = lerp(p.r0, p.rOrbit, k);
        return { x: C.x + Math.cos(th) * r, y: C.y + Math.sin(th) * r * 0.85 };
      };

      if (tau < POP) {
        const k = easeOut(tau / POP);
        return { x: lerp(p.sx, p.ax, k), y: lerp(p.sy, p.ay, k), rot: p.rot0 + tau * p.spinRate, s: k, flip: Math.cos(p.flip + tau * 6) };
      }
      if (tau < POP + SWIRL) {
        const k = easeInOut((tau - POP) / SWIRL);
        const pos = swirlPos(k);
        return { ...pos, rot: p.rot0 + tau * p.spinRate, s: 1, flip: Math.cos(p.flip + tau * 6) };
      }
      const from = swirlPos(1);
      const endSwirlRot = p.rot0 + (POP + SWIRL) * p.spinRate;
      if (tau < POP + SWIRL + FORM) {
        const k = easeInOut((tau - POP - SWIRL) / FORM);
        return {
          x: lerp(from.x, p.tx, k),
          y: lerp(from.y, p.ty, k),
          rot: endSwirlRot + angleDiff(endSwirlRot, p.tAngle) * k,
          s: 1,
          flip: lerp(Math.cos(p.flip + tau * 6), 1, k), // stops tumbling, faces up
        };
      }
      return { x: p.tx, y: p.ty, rot: p.tAngle, s: 1, flip: 1 };
    },

    render(ctx, dt) {
      if (!this.active) return;
      this.t += dt;
      const t = this.t;
      const C = this.C;

      // Once formed: celebrate once, then beat forever
      const formed = t >= this.formedAt;
      if (formed && !this.celebrated) this.celebrate();
      const beat = formed ? heartbeat(t - this.formedAt) : 0;
      const grow = formed ? Math.min(1, (t - this.formedAt) / 0.8) : 0;
      const s = 1 + 0.06 * beat;

      // Big soft pink glow behind the heart
      if (grow > 0) {
        const R = Math.max(this.box.width, this.box.height) * 0.7;
        const g = ctx.createRadialGradient(C.x, C.y, 0, C.x, C.y, R);
        g.addColorStop(0, `rgba(255, 160, 200, ${(0.16 + 0.14 * beat) * grow})`);
        g.addColorStop(1, "rgba(255, 160, 200, 0)");
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(C.x - R, C.y - R, R * 2, R * 2);
      }

      ctx.globalCompositeOperation = "source-over";
      for (const p of this.petals) {
        const q = this.place(p, t);
        if (!q) continue;
        const x = C.x + (q.x - C.x) * s;
        const y = C.y + (q.y - C.y) * s;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(q.rot);
        ctx.scale(p.size * q.s, p.size * q.s * q.flip);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = p.color;
        ctx.fill(PETAL);
        ctx.strokeStyle = "rgba(244, 170, 200, 0.8)";
        ctx.lineWidth = 3;
        ctx.stroke(PETAL);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },

    // Heart complete: sparkles around it, a chime, the star heart steps back
    celebrate() {
      this.celebrated = true;
      if (window.Love) window.Love.dimConstellation();
      if (window.Music) window.Music.chime();
      const A = window.Ambient;
      if (A && window.Love) {
        window.Love.heartPoints(8, 1, this.box).forEach((pt, i) => {
          setTimeout(() => A.burst(pt.x, pt.y, { count: 8, speed: [30, 90], hearts: 0.5 }), i * 70);
        });
      }
    },

    // After rotation: re-aim the petals at the new heart position
    retarget() {
      if (!this.active || !window.Love) return;
      const box = window.Love.frame();
      if (!box) return;
      const total = window.innerWidth <= 500 ? 84 : 124;
      const targets = avoidName([
        ...window.Love.heartPoints(Math.round(total * 0.62), 1, box),
        ...window.Love.heartPoints(Math.round(total * 0.38), 0.91, box),
      ]);
      this.petals.forEach((p, i) => {
        const tg = targets[i];
        if (!tg) return;
        p.tx = tg.x;
        p.ty = tg.y;
        p.tAngle = tg.angle;
      });
      this.box = box;
      this.C = { x: box.cx, y: box.cy };
    },

    init() {
      let tm;
      window.addEventListener("resize", () => {
        clearTimeout(tm);
        tm = setTimeout(() => this.retarget(), 400);
      }, { passive: true });
    },
  };

  window.Finale = finale;
})();
