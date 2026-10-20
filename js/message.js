/* =========================================================
   Part 7 — Intro envelope + love message
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

  /* ---------- Intro envelope ---------- */
  const intro = {
    root: null,
    opened: false,

    /**
     * @param {HTMLElement} root
     * @param {{onTap?: Function, onOpened?: Function}} cb
     *   onTap runs inside the tap itself (iOS only allows audio from a user gesture),
     *   onOpened runs once the envelope animation has finished.
     */
    init(root, { onTap, onOpened } = {}) {
      this.root = root;
      const button = root.querySelector(".intro__button");

      // Little Mesua flower tucked in the letter (reuses the garden's gradients)
      const svg = root.querySelector(".envelope__flower");
      if (svg && window.MesuaFlower) window.MesuaFlower.createFlower(svg);

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
      return new Promise((resolve) => {
        gsap.timeline({ onComplete: resolve })
          .to(q(".intro__hint"), { opacity: 0, duration: 0.3 }, 0)
          .to(q(".envelope__seal"), { scale: 1.4, duration: 0.15, ease: "power1.out" }, 0)
          .to(q(".envelope__seal"), { scale: 0, opacity: 0, duration: 0.25, ease: "back.in(2)" }, 0.15)
          .to(q(".envelope__flap"), { rotateX: 180, duration: 0.7, ease: "power2.inOut" }, 0.3)
          .set(q(".envelope__flap"), { zIndex: 1 }, 0.65)
          .to(q(".envelope__letter"), { yPercent: -62, duration: 0.8, ease: "back.out(1.6)" }, 0.9)
          .fromTo(q(".envelope__flower"),
            { scale: 0.3, rotate: -40 },
            { scale: 1, rotate: 0, duration: 0.9, ease: "back.out(2)" }, 1.0)
          .to(q(".intro__button"), { y: -30, scale: 1.08, duration: 0.6, ease: "sine.inOut" }, 2.0)
          .to(r, { opacity: 0, duration: 0.9, ease: "power2.in" }, 2.2)
          .set(r, { display: "none" });
      });
    },
  };

  window.Message = message;
  window.Intro = intro;
  window.__clusters = clusters; // handy for checking text in the console
})();
