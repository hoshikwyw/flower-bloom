/* =========================================================
   Part 14 — Jie Jie's energy recharge 🔋💖
   She starts tired (20%). Every tap sends a little heart flying
   into the battery (+8%). Tapped flowers giggle. At 100%:
   heart fireworks, a happy chime and a message card.
   ========================================================= */

(() => {
  "use strict";

  const rand = (min, max) => Math.random() * (max - min) + min;
  const GIGGLES = ["hehe ♡", "yay!", "♡", "hihi", "love you!", "✨"];

  const energy = {
    level: 20,
    full: false,
    root: null,

    build(controls) {
      const root = document.createElement("div");
      root.className = "energy";
      root.setAttribute("role", "meter");
      root.setAttribute("aria-label", "Jie Jie's energy");
      root.setAttribute("aria-valuemin", "0");
      root.setAttribute("aria-valuemax", "100");
      root.innerHTML = `
        <span class="energy__battery">
          <span class="energy__fill"></span>
          <span class="energy__pct">20%</span>
        </span>
        <span class="energy__label">Jie Jie's energy</span>`;
      controls.prepend(root);

      this.root = root;
      this.battery = root.querySelector(".energy__battery");
      this.fill = root.querySelector(".energy__fill");
      this.pct = root.querySelector(".energy__pct");

      this.toast = document.createElement("div");
      this.toast.className = "energy-toast";
      this.toast.setAttribute("role", "status");
      this.toast.innerHTML = `
        <span class="energy-toast__big">100% recharged! 💖</span>
        <span class="energy-toast__small">Now go shine, Jie Jie ✨</span>`;
      controls.parentNode.appendChild(this.toast);

      this.render();
    },

    render() {
      const lvl = Math.round(this.level);
      this.fill.style.setProperty("--lvl", lvl / 100);
      this.pct.textContent = this.full ? "MAX♡" : `${lvl}%`;
      this.root.setAttribute("aria-valuenow", String(lvl));
      this.root.dataset.state = lvl >= 100 ? "full" : lvl >= 60 ? "good" : lvl >= 35 ? "mid" : "low";
    },

    add(amount) {
      if (this.full) {
        this.bump();
        return;
      }
      this.level = Math.min(100, this.level + amount);
      if (window.Music) window.Music.pling(this.level);
      this.render();
      this.bump();
      if (this.level >= 100) this.celebrate();
    },

    // Little squish every time a heart arrives
    bump() {
      this.battery.classList.remove("is-bump");
      void this.battery.offsetWidth;
      this.battery.classList.add("is-bump");
    },

    // A heart flies from the tap to the battery in a soft arc, then charges it
    flyHeart(x, y, amount = 8) {
      if (!this.root) return;
      const b = this.battery.getBoundingClientRect();
      const tx = b.left + b.width / 2;
      const ty = b.top + b.height / 2;

      if (!window.gsap) {
        this.add(amount);
        return;
      }

      const h = document.createElement("span");
      h.className = "fly-heart";
      h.textContent = "💗";
      document.getElementById("scene").appendChild(h);

      const midX = (x + tx) / 2 + rand(-60, 60);
      const midY = Math.min(y, ty) - rand(40, 90);
      gsap.set(h, { x, y, xPercent: -50, yPercent: -50, scale: 0.4 });
      gsap.timeline({
        onComplete: () => {
          h.remove();
          this.add(amount);
        },
      })
        .to(h, { scale: 1.2, duration: 0.18, ease: "back.out(3)" })
        .to(h, {
          keyframes: [
            { x: midX, y: midY, duration: 0.35, ease: "sine.out" },
            { x: tx, y: ty, scale: 0.5, duration: 0.35, ease: "sine.in" },
          ],
        });
    },

    // Flower giggles: wiggle + ^ ^ face + "hehe ♡" floating up
    giggle(plant, x, y) {
      const f = plant.flower;
      if (!f || f.giggling || !window.gsap) return;
      f.giggling = true;

      const p = { r: 0, s: 1 };
      const apply = () => f.body.setAttribute("transform", `rotate(${p.r.toFixed(2)}) scale(${p.s.toFixed(3)})`);
      gsap.to(p, {
        keyframes: [
          { r: -12, s: 1.12, duration: 0.1 },
          { r: 10, duration: 0.1 },
          { r: -8, duration: 0.1 },
          { r: 6, duration: 0.1 },
          { r: -3, s: 1.04, duration: 0.1 },
          { r: 0, s: 1, duration: 0.2 },
        ],
        onUpdate: apply,
      });

      if (f.face && f.face.joy) {
        f.face.awake.setAttribute("opacity", 0);
        f.face.joy.setAttribute("opacity", 1);
        setTimeout(() => {
          f.face.joy.setAttribute("opacity", 0);
          f.face.awake.setAttribute("opacity", 1);
          f.giggling = false;
        }, 1100);
      } else {
        setTimeout(() => (f.giggling = false), 900);
      }

      // Floating speech
      const t = document.createElement("span");
      t.className = "giggle-text";
      t.textContent = GIGGLES[(Math.random() * GIGGLES.length) | 0];
      t.style.left = `${x}px`;
      t.style.top = `${y - 30}px`;
      document.getElementById("scene").appendChild(t);
      t.addEventListener("animationend", () => t.remove(), { once: true });
      setTimeout(() => t.remove(), 2000);
    },

    // 100%! Heart fireworks across the sky + chime + message card
    celebrate() {
      this.full = true;
      this.render();
      this.root.classList.add("is-full");
      if (window.Music) window.Music.chime();

      const A = window.Ambient;
      if (A && A.running) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            A.burst(rand(0.15, 0.85) * w, rand(0.15, 0.55) * h, { count: 26, speed: [90, 220], hearts: 0.6 });
          }, i * 280);
        }
      }

      this.toast.classList.add("is-visible");
      setTimeout(() => this.toast.classList.remove("is-visible"), 4200);
    },
  };

  window.Energy = energy;
})();
