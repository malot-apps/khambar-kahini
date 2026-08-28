/* ============ audio.js — Reusable Audio Manager ============ */
/* Gracefully degrades if any file is missing. Never throws. */

import { loadSave, persistSave } from './utils.js';

function loadS() { return loadSave(); }

class AudioManager {
  constructor() {
    this.ctx = null;
    this.music = null;        // background loop element
    this.musicName = null;
    this.soundOn = true;
    this.musicOn = true;
    this._musicVol = 0.25;
    this._sounds = {};        // name -> HTMLAudioElement
    this._resume = () => { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); };
  }

  /* Must be called from a user gesture to unlock audio. */
  init() {
    const save = loadS();
    this.soundOn = !!save.sound;
    this.musicOn = !!save.music;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !this.ctx) this.ctx = new AC();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch (_) { this.ctx = null; }
    window.addEventListener('pointerdown', this._resume, { passive: true });
    window.addEventListener('keydown', this._resume);
  }

  /* ---------- Settings ---------- */
  setSound(on) {
    this.soundOn = !!on;
    const save = loadS(); save.sound = on; persistSave(save);
    if (!on) this.stopAll();
  }
  setMusic(on) {
    this.musicOn = !!on;
    const save = loadS(); save.music = on; persistSave(save);
    if (on) this.playMusic('bg'); else this.stopMusic();
  }

  /* ---------- low-level synth helpers ---------- */
  _synth(freq, type, dur, vol) {
    if (!this.ctx || !this.soundOn || this.ctx.state !== 'running') return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (_) {}
  }

  _blip(freq = 660) { this._synth(freq, 'triangle', 0.09, 0.09); }

  async _load(name, url) {
    if (this._sounds[name]) return this._sounds[name];
    let a;
    try { a = new Audio(url); a.preload = 'auto'; }
    catch (_) { return null; }
    this._sounds[name] = a;
    return new Promise((resolve) => {
      let done = false;
      const fin = () => { if (!done) { done = true; resolve(a); } };
      a.oncanplaythrough = fin;
      a.onerror = () => { a.usable = false; fin(); };
      setTimeout(fin, 800);
    });
  }

  /* ---------- generic play ---------- */
  async playOnce(name, fallback) {
    if (!this.soundOn) return;
    const url = `assets/audio/sfx/${name}.mp3`;
    const a = await this._load(name, url);
    if (a && a.usable !== false) {
      try { a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => fallback && fallback()); }
      catch (_) { if (fallback) fallback(); }
      return;
    }
    if (fallback) fallback();
  }

  click() { this.playOnce('click', () => this._blip(680)); }

  /* ---------- Music loop ---------- */
  async playMusic(name = 'bg') {
    if (!this.musicOn) return;
    const url = `assets/audio/music/${name}.mp3`;
    const a = await this._load(`m_${name}`, url);
    if (a && a.usable !== false) {
      if (this.music && this.music !== a) this.stopMusic();
      this.music = a; this.musicName = name;
      a.loop = true; a.volume = this._musicVol;
      a.play().catch(() => { this._drone(); });
    } else {
      this._drone();
    }
  }

  _drone() {
    // gentle ambient so a missing file never breaks the game
    try {
      if (!this.ctx || !this.musicOn || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = 110;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 2);
      g.gain.linearRampToValueAtTime(0.02, t + 4);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + 4.5);
    } catch (_) {}
  }

  stopMusic() { if (this.music) { try { this.music.pause(); this.music.currentTime = 0; } catch (_) {} } }
  stopAll() { this.stopMusic(); this.stopVoice(); }

  /* ---------- game sounds with synth fallbacks ---------- */
  powerOn() { this.playOnce('power_on', () => this._blip(880)); }
  powerOff() { this.playOnce('power_off', () => this._blip(160)); }
  cardboard() { this.playOnce('dialogue', () => this._blip(520)); }
  win() { this.playOnce('win', () => this.tone([523, 659, 784], 0.14)); }
  lose() { this.playOnce('lose', () => this.tone([200, 170], 0.2)); }

  tone(freqs, step = 0.15, vol = 0.09) {
    if (!this.ctx || !this.soundOn || this.ctx.state !== 'running') return;
    let t = this.ctx.currentTime;
    freqs.forEach((f) => {
      try {
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + step);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(t); o.stop(t + step + 0.02);
        t += step;
      } catch (_) {}
    });
  }

  /* ---------- Custom Power Babu voice slot ---------- */
  /* Plays assets/audio/we_have_a_plan.mp3 IF present; else stays silent.
     - never throws, missing file is handled gracefully
     - prevents repeated/overlapping accidental playback
     - onDone fires exactly once (playback start, end, or error) */
  playPowerBabuVoice(onDone) {
    const settle = () => {
      if (this._voiceSettled) return;
      this._voiceSettled = true;
      this._voiceBusy = false;
      if (typeof onDone === 'function') onDone();
    };
    if (!this.soundOn) { settle(); return; }
    /* a clip already playing? stop it, then start cleanly */
    if (this._voiceBusy) this.stopVoice();
    this._voiceBusy = true;
    this._voiceSettled = false;
    try {
      const a = new Audio('assets/audio/we_have_a_plan.mp3');
      a.preload = 'auto';
      this.voice = a;
      a.addEventListener('playing', settle, { once: true });   /* continue the story as the voice starts */
      a.addEventListener('ended', settle, { once: true });
      a.addEventListener('error', settle, { once: true });     /* missing/corrupt file */
      const p = a.play();
      if (p && p.catch) p.catch(settle);                       /* autoplay-blocked etc. */
      setTimeout(settle, 4000);                                /* hard safety net */
    } catch (_) { settle(); }
  }

  stopVoice() {
    try { if (this.voice) { this.voice.pause(); this.voice.removeAttribute('src'); } } catch (_) { /* ignore */ }
    this.voice = null;
    this._voiceBusy = false;
  }
}