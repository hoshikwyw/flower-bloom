# 🌸 Flowers for Mama

A surprise night garden of **Mesua ferrea** (ကံ့ကော်) flowers that grow and bloom
just for her, with a love message in Myanmar and a little music-box melody.

## The experience

1. A floating envelope: **"Mama အတွက်"** → tap to open
2. Stems grow out of the hills, pink-red young leaves unfurl and turn green
3. Buds swell, 4 white petals unfold, golden stamens burst like fireworks
4. Her name appears, then the Myanmar message types out line by line
5. Fireflies, drifting pollen, falling petals, flowers swaying in the wind
6. Tap anywhere to bloom a new flower 🌸, tap a bud to open it

Made mobile-first, tuned for **iPhone 12 mini** (375 × 812).

## Run locally

No build step. Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Edit the message

All the text is in `PAGES` at the top of [`js/message.js`](js/message.js).
Each page is two lines; the last page stays on screen.

## Project structure

```
index.html          page + layers (sky, garden, particles, message, intro)
css/style.css       design tokens, layout, iPhone safe areas, animations
js/flower.js        SVG builder for the Mesua ferrea plant
js/growth.js        stem / leaf / bud growth timeline (GSAP)
js/bloom.js         bud → flower bloom timeline (GSAP)
js/ambient.js       wind, fireflies, pollen, falling petals, tap bursts
js/message.js       envelope intro + Myanmar typewriter message
js/music.js         music-box melody generated with Web Audio
js/interact.js      tap to bloom, bud blooming, music button
js/main.js          wires everything together
js/vendor/          GSAP 3.12.5
```

## Deploy

Hosted on GitHub Pages: push to `main`, then **Settings → Pages → Deploy from a branch → main / (root)**.

Made with love 💛
