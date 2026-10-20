/* =========================================================
   Part 8 — Music: a cute, warm music-box love melody
   Generated live with the Web Audio API (no mp3 needed):
   music-box bell voice + soft warm pad + gentle reverb.
   ========================================================= */

(() => {
  "use strict";

  const BPM = 78;
  const EIGHTH = 60 / BPM / 2;
  const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // 8 bars × 8 eighth notes, C major. null = rest.
  const MELODY = [
    76, null, 79, null, 84, null, 79, null,  // C
    81, null, 79, null, 76, null, 72, null,  // Am
    77, null, 81, null, 84, null, 81, null,  // F
    79, null, null, 74, 79, null, 83, null,  // G
    84, null, 83, null, 79, null, 76, null,  // C
    81, null, 84, null, 88, null, 86, 84,    // Am
    81, null, 77, null, 79, null, 81, 79,    // F
    76, null, 74, null, 72, null, null, null, // C
  ];

  // One chord per bar (root position, octave 3)
  const CHORDS = [
    [48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50],
    [48, 52, 55], [45, 48, 52], [41, 45, 48], [48, 52, 55],
  ];

  const music = {
    ctx: null,
    master: null,
    dry: null,
    send: null,  // input of the reverb
    enabled: false,
    timer: null,
    nextTime: 0,
    step: 0,

    // Small generated "room" so notes ring softly
    makeReverb(ctx, seconds = 2.6) {
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        }
      }
      const conv = ctx.createConvolver();
      conv.buffer = buf;
      return conv;
    },

    setup() {
      // Let iPhone play sound even when the ring/silent switch is on (Safari 16.4+)
      try {
        if (navigator.audioSession) navigator.audioSession.type = "playback";
      } catch (_) { /* not supported */ }

      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const ctx = new AC();

      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // Warm it up: roll off harsh highs
      const tone = ctx.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value = 5200;
      tone.connect(master);

      const dry = ctx.createGain();
      dry.gain.value = 0.8;
      dry.connect(tone);

      const reverb = this.makeReverb(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.38;
      reverb.connect(wet).connect(tone);

      Object.assign(this, { ctx, master, dry, send: reverb });
      return true;
    },

    // Music-box tine: pure tone + bell-like overtones, quick pluck, long ring
    bell(midi, time, gain = 0.16, length = 1.8) {
      const { ctx } = this;
      const f = midiToHz(midi);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, time);
      env.gain.exponentialRampToValueAtTime(gain, time + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, time + length);
      env.connect(this.dry);
      env.connect(this.send);

      [[1, 1, "sine"], [2, 0.18, "triangle"], [3.01, 0.08, "sine"], [5.4, 0.03, "sine"]]
        .forEach(([mult, amp, type]) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = type;
          osc.frequency.value = f * mult;
          osc.detune.value = (Math.random() - 0.5) * 6; // tiny wobble = warmth
          g.gain.value = amp;
          osc.connect(g).connect(env);
          osc.start(time);
          osc.stop(time + length + 0.05);
        });
    },

    // Soft pad chord underneath, swells in and out over a bar
    pad(chord, time, length) {
      const { ctx } = this;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(0.03, time + length * 0.35);
      env.gain.linearRampToValueAtTime(0.0001, time + length * 1.05);
      lp.connect(env);
      env.connect(this.dry);
      env.connect(this.send);

      chord.forEach((m) => {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = midiToHz(m + 12);
        osc.detune.value = (Math.random() - 0.5) * 10;
        osc.connect(lp);
        osc.start(time);
        osc.stop(time + length * 1.1);
      });
    },

    scheduleStep(step, time) {
      const bar = Math.floor(step / 8) % CHORDS.length;
      const beat = step % 8;
      const chord = CHORDS[bar];

      if (beat === 0) this.pad(chord, time, EIGHTH * 8);

      // Gentle low arpeggio on each quarter note
      if (beat % 2 === 0) {
        const arp = [chord[0], chord[1], chord[2], chord[1]][beat / 2];
        this.bell(arp + 12, time, 0.05, 1.4);
      }

      const note = MELODY[step];
      if (note) this.bell(note, time, 0.15, 2.0);
    },

    // Look-ahead scheduler: steady timing even if the main thread is busy
    tick() {
      while (this.nextTime < this.ctx.currentTime + 0.25) {
        this.scheduleStep(this.step, this.nextTime);
        this.nextTime += EIGHTH;
        this.step = (this.step + 1) % MELODY.length;
      }
    },

    fadeTo(value, seconds) {
      const g = this.master.gain;
      const now = this.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(value, now + seconds);
    },

    // Must be called from a tap (iOS rule)
    play() {
      if (!this.ctx && !this.setup()) return;
      this.enabled = true;
      this.ctx.resume();
      if (!this.timer) {
        this.nextTime = this.ctx.currentTime + 0.1;
        this.timer = setInterval(() => this.tick(), 60);
      }
      this.fadeTo(0.55, 2.5);
    },

    pause() {
      if (!this.ctx) return;
      this.enabled = false;
      this.fadeTo(0, 0.6);
      setTimeout(() => {
        if (this.enabled) return;
        clearInterval(this.timer);
        this.timer = null;
        this.ctx.suspend();
      }, 650);
    },

    /* ---------- Part 14: little sound effects ---------- */

    // A music-box "pling" that climbs higher as her energy fills up
    pling(level) {
      if (!this.ctx || !this.enabled) return;
      const scale = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];
      const i = Math.min(scale.length - 1, Math.round((level / 100) * (scale.length - 1)));
      this.bell(scale[i], this.ctx.currentTime + 0.01, 0.13, 1.3);
    },

    // Happy sparkly arpeggio at 100%
    chime() {
      if (!this.ctx || !this.enabled) return;
      const now = this.ctx.currentTime + 0.02;
      [84, 88, 91, 96, 100].forEach((m, i) => this.bell(m, now + i * 0.09, 0.14, 1.8));
      [72, 76, 79].forEach((m) => this.bell(m, now + 0.5, 0.08, 2.4));
    },

    toggle() {
      if (this.enabled) this.pause();
      else this.play();
      return this.enabled;
    },

    init() {
      // Pause with the tab hidden / phone locked; resume when back
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend();
        else if (this.enabled) this.ctx.resume();
      });
    },
  };

  window.Music = music;
})();
