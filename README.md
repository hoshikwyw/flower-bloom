# 🌸 Flowers for Jie Jie

A surprise night garden of **Mesua ferrea** (ကံ့ကော်) flowers that grow and bloom
just for her, with a little love message and a music-box melody.

## The experience

1. A shaking blind box: **"ပါဆယ် လာတယ်ဗျို့"** → tap, the lid pops off and a smiling flower jumps out
2. Stems grow out of the hills, pink-red young leaves unfurl and turn green
3. Buds swell, 4 white petals unfold, golden stamens burst like fireworks
4. Her name appears, then the love message types out line by line
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
js/ambient.js       wind, fireflies, pollen, petals, heart bokeh, butterflies, tap bursts
js/message.js       blind box intro + typewriter love message
js/love.js          heart constellation + blushing moon
js/finale.js        petals swirl into a giant beating heart
js/energy.js        "Jie Jie's energy" battery, flying hearts, giggling flowers
js/music.js         music-box melody + plings/chimes, generated with Web Audio
js/interact.js      tap handling, bud blooming, music button
js/main.js          wires everything together
js/vendor/          GSAP 3.12.5
assets/og-card.png  link preview card (blind box)
```

## Deploy

Hosted on GitHub Pages: push to `main`, then **Settings → Pages → Deploy from a branch → main / (root)**.

Made with love 💛
