/* =========================================================
   Part 7 — Intro blind box + love message
   ========================================================= */

(() => {
  "use strict";

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- The message ----------
     Shown a page at a time (two lines each); the last page stays on screen. */
  const NAME = "Jie Jie";
  const PAGES = [
    ["You've been working so hard lately…", "I know you're tired, Jie Jie"],
    ["So take a little break with me", "and watch these flowers bloom 🌸"],
    ["Every single one of them", "bloomed just for you"],
    ["You're stronger than you know", "and you're never alone 💛"],
    ["No matter how tired you get,", "I'll always be right here"],
    ["Rest well, and smile a little", "I love you so much ❤️"],
  ];

  /* ---------- Typewriter "letters" ----------
     Keeps emoji (❤️ = ❤ + U+FE0F) and any combining marks
     (e.g. Myanmar vowels ေ ြ ်, if the text is ever changed back)
     together with the character before them, so nothing renders broken. */
  const isMyanmarMark = (c) =>
    (c >= 0x102b && c <= 0x103e) || (c >= 0x1056 && c <= 0x1059) ||
    (c >= 0x105e && c <= 0x1060) || (c >= 0x1062 && c <= 0x1064) ||
    (c >= 0x1067 && c <= 0x106d) || (c >= 0x1071 && c <= 0x1074) ||
    (c >= 0x1082 && c <= 0x108d) || c === 0x108f || (c >= 0x109a && c <= 0x109d);

  function clusters(text) {
    const out = [];
    let joinNext = false;
    for (const ch of text) {
      const code = ch.codePointAt(0);
      const attach = out.length && (joinNext || isMyanmarMark(code) || code === 0xfe0f || code === 0x200d);
      if (attach) out[out.length - 1] += ch;
      else out.push(ch);
      joinNext = code === 0x1039 || code === 0x200d; // virama / zero-width joiner
    }
    return out;
  }

  /* ---------- Message ---------- */
  const message = {
    root: null,
    reduced: false,

    build(root, reduced) {
      this.root = root;
      this.reduced = reduced;
      root.innerHTML = "";

      // Name in script, one letter at a time
      const name = document.createElement("h1");
      name.className = "message__name";
      name.setAttribute("aria-label", NAME);
      [...NAME, " ", "♡"].forEach((ch, i) => {
        const s = document.createElement("span");
        s.className = ch === "♡" ? "message__char message__heart" : "message__char";
        s.textContent = ch === " " ? " " : ch;
        s.style.transitionDelay = `${i * 0.12}s`;
        s.setAttribute("aria-hidden", "true");
        name.appendChild(s);
      });

      const page = document.createElement("div");
      page.className = "message__page";

      root.append(name, page);
      this.nameEl = name;
      this.pageEl = page;
    },

    // Builds one line: visible typed part + caret + invisible rest (keeps layout steady)
    makeLine(text) {
      const p = document.createElement("p");
      p.className = "message__line";
      const sr = document.createElement("span");
      sr.className = "visually-hidden";
      sr.textContent = text;
      const shown = document.createElement("span");
      shown.className = "message__shown";
      shown.setAttribute("aria-hidden", "true");
      const caret = document.createElement("span");
      caret.className = "message__caret";
      caret.setAttribute("aria-hidden", "true");
      const rest = document.createElement("span");
      rest.className = "message__rest";
      rest.setAttribute("aria-hidden", "true");
      rest.textContent = text;
      p.append(sr, shown, caret, rest);
      return { p, shown, caret, rest, parts: clusters(text) };
    },

    async typeLine(line, speed = 75) {
      line.p.classList.add("is-typing");
      if (this.reduced) {
        line.shown.textContent = line.parts.join("");
        line.rest.textContent = "";
      } else {
        for (let i = 1; i <= line.parts.length; i++) {
          line.shown.textContent = line.parts.slice(0, i).join("");
          line.rest.textContent = line.parts.slice(i).join("");
          // Linger a little on spaces so phrases breathe
          await wait(line.parts[i - 1] === " " ? speed * 2.5 : speed);
        }
      }
      line.p.classList.remove("is-typing");
    },

    async showPage(lines, isLast) {
      const page = this.pageEl;
      page.classList.remove("is-leaving");
      page.innerHTML = "";
      const built = lines.map((t) => this.makeLine(t));
      built.forEach((l) => page.appendChild(l.p));
      page.classList.add("is-visible");

      for (const line of built) {
        await this.typeLine(line);
        await wait(350);
      }

      if (isLast) {
        page.classList.add("is-final");
        return;
      }
      await wait(this.reduced ? 3500 : 2400);
      page.classList.add("is-leaving");
      await wait(700);
      page.classList.remove("is-visible");
    },

    async play() {
      // Make sure the Myanmar + script fonts are ready (max 2s wait on slow networks)
      if (document.fonts && document.fonts.ready) {
        await Promise.race([document.fonts.ready, wait(2000)]);
      }
      this.root.classList.add("is-active");
      await wait(100);
      this.nameEl.classList.add("is-visible");
      await wait(1400);
      for (let i = 0; i < PAGES.length; i++) {
        await this.showPage(PAGES[i], i === PAGES.length - 1);
      }
    },
  };

  /* ---------- Intro blind box ---------- */
  const CONFETTI = ["💗", "♡", "✦", "🌸", "✨", "💖"];

  const intro = {
    root: null,
    opened: false,

    /**
     * @param {HTMLElement} root
     * @param {{onTap?: Function, onOpened?: Function}} cb
     *   onTap runs inside the tap itself (iOS only allows audio from a user gesture),
     *   onOpened runs once the box-opening animation has finished.
     */
    init(root, { onTap, onOpened } = {}) {
      this.root = root;
      const button = root.querySelector(".intro__button");

      // The surprise inside: a Mesua flower, already awake and smiling
      // (reuses the garden's gradients, so the garden must be built first)
      const svg = root.querySelector(".blindbox__flower");
      if (svg && window.MesuaFlower) {
        const f = window.MesuaFlower.createFlower(svg);
        f.face.sleep.setAttribute("opacity", 0);
        f.face.awake.setAttribute("opacity", 1);
      }

      const open = () => {
        if (this.opened) return;
        this.opened = true;
        if (onTap) onTap();
        this.animateOpen().then(() => onOpened && onOpened());
      };
      button.addEventListener("click", open);
      requestAnimationFrame(() => root.classList.add("is-ready"));
    },

    animateOpen() {
      const r = this.root;
      r.classList.add("is-opening");

      if (!window.gsap) {
        r.classList.add("is-gone");
        return wait(600);
      }

      const q = (s) => r.querySelector(s);
      const box = q(".blindbox");
      const lid = q(".blindbox__lid");
      return new Promise((resolve) => {
        gsap.timeline({ onComplete: resolve })
          .to(q(".intro__hint"), { opacity: 0, duration: 0.3 }, 0)
          // 1. Squish… stretch… (she pressed it!)
          .to(box, { scaleX: 1.12, scaleY: 0.86, duration: 0.16, ease: "power2.out" }, 0)
          .to(box, { scaleX: 0.94, scaleY: 1.08, duration: 0.16, ease: "sine.inOut" }, 0.16)
          .to(box, { scaleX: 1, scaleY: 1, duration: 0.18, ease: "sine.out" }, 0.32)
          // 2. Something inside is going crazy
          .to(box, {
            keyframes: [
              { rotate: -9 }, { rotate: 8 }, { rotate: -8 }, { rotate: 7 },
              { rotate: -5 }, { rotate: 3 }, { rotate: 0 },
            ],
            duration: 0.65,
            ease: "none",
          }, 0.45)
          .to(lid, { y: -6, duration: 0.08, yoyo: true, repeat: 5 }, 0.45)
          // 3. POP — the lid flies off
          .to(lid, { y: -190, x: 46, rotate: -38, duration: 0.95, ease: "power2.out" }, 1.15)
          .to(lid, { opacity: 0, duration: 0.35 }, 1.75)
          // 4. Light bursts out and the smiling flower jumps up
          .to(q(".blindbox__rays"), { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" }, 1.2)
          .fromTo(q(".blindbox__surprise"),
            { y: 40, scale: 0.3, rotate: -30, opacity: 0 },
            { y: -82, scale: 1.15, rotate: 0, opacity: 1, duration: 0.85, ease: "back.out(2.2)" }, 1.25)
          .add(() => this.confetti(), 1.3)
          // Title floats up out of the flower's way
          .to(q(".intro__title"), { y: -78, scale: 1.08, duration: 0.6, ease: "back.out(1.8)" }, 1.15)
          // 5. Everything fades into the garden
          .to(r, { opacity: 0, duration: 0.9, ease: "power2.in" }, 3.0)
          .set(r, { display: "none" });
      });
    },

    // Hearts & sparkles pop out of the open box
    confetti() {
      const holder = this.root.querySelector(".blindbox__confetti");
      if (!holder) return;
      for (let i = 0; i < 18; i++) {
        const s = document.createElement("span");
        s.textContent = CONFETTI[i % CONFETTI.length];
        holder.appendChild(s);
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3; // mostly upward
        const d = 80 + Math.random() * 110;
        gsap.fromTo(s,
          { x: 0, y: 0, xPercent: -50, yPercent: -50, scale: 0.3, opacity: 1, rotate: 0 },
          {
            x: Math.cos(a) * d,
            y: Math.sin(a) * d,
            scale: 0.8 + Math.random() * 0.6,
            rotate: (Math.random() - 0.5) * 120,
            duration: 0.9 + Math.random() * 0.5,
            ease: "power2.out",
          });
        gsap.to(s, { opacity: 0, y: "+=40", duration: 0.6, delay: 0.9 + Math.random() * 0.4, ease: "power1.in" });
      }
    },
  };

  window.Message = message;
  window.Intro = intro;
  window.__clusters = clusters; // handy for checking text in the console
})();
