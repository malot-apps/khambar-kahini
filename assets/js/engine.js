/* ============ engine.js — 2D Canvas Game Engine ============ */
import { el, clear, clamp, vibrate, toast } from './utils.js';
import { Audio } from './audio.js';
import { Characters } from './characters.js';
import { resultScreen, pauseOverlay, makeOverlayRoot } from './ui.js';

const KEYS = {
  up: ['ArrowUp', 'w', 'W'], down: ['ArrowDown', 's', 'S'],
  left: ['ArrowLeft', 'a', 'A'], right: ['ArrowRight', 'd', 'D'],
};

/* dialog speaker → character registry id */
const WHO_ID = {
  player: 'player', you: 'player',
  babu: 'power_babu', boss: 'power_babu',
  pole: 'pole', assistant: 'assistant', lineman: 'lineman',
  shopkeeper: 'shopkeeper', rickshaw: 'rickshaw',
  tea_seller: 'tea_seller', secret_npc: 'secret_npc',
};

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.w = 34; this.h = 56; this.facing = 1; // 1 right, -1 left
    this.walkT = 0; this.moving = false;
    this.dir = { x: 0, y: 0 };
  }
}

export class Engine {
  constructor() {
    this.ctx = null;
    this.canvas = null;
    this.dpr = 1;
    this.W = 0; this.H = 0;
    this.wrap = null;
    this.running = false;
    this.raf = null;
    this.keys = {};
    this.last = 0;

    this.cfg = null;        // active level config
    this.player = null;     // Player stats object
    this.world = { w: 1400, h: 800 };
    this.cam = { x: 0, y: 0 };
    this.objects = [];       // interactables
    this.physics = [];       // solid rectangles
    this.decor = [];         // decorative drawables
    this.dialog = null;
    this.overlays = [];      // DOM overlay nodes in overlayRoot
    this.hudTimer = 0;
    this.time = 0;          // seconds since start (drives ambient animation)
    this.flashT = 0;        // power ON/OFF transition flash
    this.flashOn = false;
    this.onLevelSelect = null; // optional hook set by the shell (main.js)

    this.touch = { ax: 0, ay: 0, active: false };

    // DOM
    this.mountPoint = null;
    this.hudEls = {};
    this.objectivesEl = null;
    this.overlayRoot = null;
    this.paused = false;
  }

  /* ---- mount canvas & HUD into a root ---------- */
  mount(root) {
    if (!root) return;
    this.ctrlHost = root;
    clear(root);

    this.wrap = el('div', { class: 'game-wrap' });
    this.canvas = el('canvas');
    this.wrap.appendChild(this.canvas);

    // HUD
    const hud = el('div', { class: 'hud' }, [
      el('div', { class: 'left' }),
      el('div', { class: 'right' }, [
        el('button', { class: 'icon-btn', text: '🔊', onclick: () => this.toggleMute() }),
        el('button', { class: 'icon-btn', text: '⏸️', onclick: () => this.pause() }),
      ]),
    ]);
    this.hudEls.left = hud.querySelector('.left');
    this.wrap.appendChild(hud);

    // objectives
    this.objectivesEl = el('div', { class: 'objectives' });
    this.wrap.appendChild(this.objectivesEl);

    // touch joystick
    this.joystick = el('div', { class: 'joystick-zone' }, [
      el('div', { class: 'joystick' }, [ el('div', { class: 'knob' }) ]),
    ]);
    this.knob = this.joystick.querySelector('.knob');
    this.wrap.appendChild(this.joystick);

    // interact button
    this.interactBtn = el('button', { class: 'interact-btn', text: 'যোগাযোগ' });
    this.wrap.appendChild(this.interactBtn);

    // overlay root
    this.overlayRoot = makeOverlayRoot();
    this.wrap.appendChild(this.overlayRoot);

    root.appendChild(this.wrap);

    this.resize();
    if (!this._onResize) {
      this._onResize = () => this.resize();
      window.addEventListener('resize', this._onResize, { passive: true });
    }

    this.bindInput();
  }

  /* ---------- sizing ---------- */
  resize() {
    if (!this.canvas) return;
    const rect = this.wrap ? this.wrap.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    this.W = rect.width || window.innerWidth;
    this.H = rect.height || window.innerHeight;
    this.dpr = (window.devicePixelRatio || 1) > 2 ? 2 : 1;
    this.canvas.width = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx = this.canvas.getContext('2d');
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /* ---------- input ---------- */
  bindInput() {
    if (!this._glob) {
      this._glob = true;
      window.addEventListener('keydown', (e) => {
      if (this.paused) return;
      const k = e.key;
      for (const dir of Object.keys(KEYS)) {
        if (KEYS[dir].includes(k)) { this.keys[dir] = true; e.preventDefault(); break; }
      }
      if (k === ' ' || k === 'e' || k === 'E' || k === 'Enter') { e.preventDefault(); this.playerAct(); }
      if (k === 'p' || k === 'P' || k === 'Escape') this.pause();
    });
    window.addEventListener('keyup', (e) => {
      for (const dir of Object.keys(KEYS)) if (KEYS[dir].includes(e.key)) this.keys[dir] = false;
    });
    }
    const zone = this.joystick;
    const knob = this.knob;
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) zone.classList.add('hidden');
    const moveKnob = (cx, cy) => {
      const rect = zone.getBoundingClientRect();
      const bx = rect.left + rect.width / 2;
      const by = rect.top + rect.height / 2;
      let dx = cx - bx, dy = cy - by;
      const dist = Math.hypot(dx, dy);
      const max = rect.width / 2 - 12;
      if (dist > max) { dx = dx / dist * max; dy = dy / dist * max; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      this.touch.ax = dx / max; this.touch.ay = dy / max; this.touch.active = true;
    };
    const resetKnob = () => { knob.style.transform = 'translate(0,0)'; this.touch.ax = 0; this.touch.ay = 0; this.touch.active = false; };
    zone.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.touches[0]; moveKnob(t.clientX, t.clientY); }, { passive: false });
    zone.addEventListener('touchmove', (e) => { e.preventDefault(); const t = e.touches[0]; moveKnob(t.clientX, t.clientY); }, { passive: false });
    zone.addEventListener('touchend', resetKnob);
    zone.addEventListener('touchcancel', resetKnob);
    this.interactBtn.addEventListener('click', () => { vibrate(20); this.playerAct(); });
  }

  /* ---------- level config ---------- */
  start(cfg, root) {
    if (root) this.mount(root);
    this.cfg = cfg;
    this.world.w = cfg.worldW || 1400;
    this.world.h = cfg.worldH || 800;
    this.player = new Player(cfg.playerStart?.x || 120, cfg.playerStart?.y || 600);
    this.player.speed = cfg.playerSpeed;
    this.player.stats = Object.assign({
      energy: 100, battery: 100, money: 500, frustration: 0, score: 0,
      outageTime: 0, complaints: 0, polesChecked: 0, moneySpent: 0,
    }, cfg.initialStats || {});
    this.physics = cfg.physics || [];
    this.objects = cfg.objects || [];
    this.power = cfg.powerOn !== false;
    this.tint = cfg.tint || '#0b1020';
    this.cam.x = clamp(this.player.x - this.W / 2, 0, Math.max(0, this.world.w - this.W));
    this.cam.y = clamp(this.player.y - this.H / 2, 0, Math.max(0, this.world.h - this.H));
    this.clearOverlays();
    this.objectives(cfg.objectives || []);
    this.updateHud();
    this.running = true;
    this.paused = false;
    this.last = performance.now();
    if (this.raf) cancelAnimationFrame(this.raf);
    const loop = (t) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.time = t / 1000;
      if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt);
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { this.running = false; if (this.raf) cancelAnimationFrame(this.raf); }

  /* ---------- update ---------- */
  update(dt) {
    if (this.paused || this.dialogLock) return;
    let ix = 0, iy = 0;
    if (this.keys.left || this.touch.ax < 0) ix -= 1;
    if (this.keys.right || this.touch.ax > 0) ix += 1;
    if (this.keys.up || this.touch.ay < 0) iy -= 1;
    if (this.keys.down || this.touch.ay > 0) iy += 1;
    if (this.touch.active) { ix = this.touch.ax; iy = this.touch.ay; }
    const len = Math.hypot(ix, iy) || 1;
    const sp = (this.player.speed || 170) * dt;
    const nx = this.player.x + (ix / len) * sp;
    const ny = this.player.y + (iy / len) * sp;
    if (!this.collides(nx, this.player.y)) this.player.x = nx;
    if (!this.collides(this.player.x, ny)) this.player.y = ny;
    this.player.x = clamp(this.player.x, 16, this.world.w - 16);
    this.player.y = clamp(this.player.y, 16, this.world.h - 16);
    if (ix !== 0) this.player.facing = ix < 0 ? -1 : 1;
    this.player.moving = Math.abs(ix) > 0.05 || Math.abs(iy) > 0.05;
    if (this.player.moving) this.player.walkT += dt * 9;

    this.cam.x = clamp(this.player.x - this.W / 2, 0, Math.max(0, this.world.w - this.W));
    this.cam.y = clamp(this.player.y - this.H / 2, 0, Math.max(0, this.world.h - this.H));

    if (this.cfg.update) this.cfg.update.call(this, dt);

    if (this.power === false && this.cfg.frustrateOnDark) {
      this.player.stats.frustration = Math.min(100, this.player.stats.frustration + dt * 2);
      this.player.stats.outageTime += dt;
    }

    /* interact button feedback pulse when an interactable is in range */
    if (this.interactBtn) {
      const near = this.nearbyObject();
      this.interactBtn.classList.toggle('ready', !!(near && near.onInteract));
    }
  }

  collides(x, y) {
    for (const p of this.physics) {
      if (x > p.x - p.w / 2 - 8 && x < p.x + p.w / 2 + 8 && y > p.y - p.h / 2 - 8 && y < p.y + p.h / 2 + 8) return true;
    }
    return false;
  }

  setPower(on) {
    if (this.power === on) return;
    this.power = on;
    this.flashT = on ? 0.45 : 0.6;
    this.flashOn = on;
    if (on) Audio.powerOn(); else Audio.powerOff();
    this.updateHud();
  }

  /* ---------- player act ---------- */
  playerAct() {
    if (this.dialogLock) return;
    if (this.cfg && this.cfg.onPlayerAct) { this.cfg.onPlayerAct(this); return; }
    const target = this.nearbyObject();
    if (target && target.onInteract) target.onInteract(target, this);
  }

  nearbyObject() {
    let best = null, bd = 66;
    for (const o of this.objects) {
      const d = Math.hypot(this.player.x - o.x, this.player.y - o.y);
      if (d < bd && o.activable !== false) { bd = d; best = o; }
    }
    return best;
  }

  nearestObject() {
    let best = null, bd = Infinity;
    for (const o of this.objects) {
      const d = Math.hypot(this.player.x - o.x, this.player.y - o.y);
      if (d < bd) { bd = d; best = o; }
    }
    return { obj: best, d: bd };
  }

  /* ---------- pause / mute ---------- */
  pause() {
    if (!this.running) return;
    this.paused = true;
    Audio.stopMusic();
    const ov = pauseOverlay(() => this.backToHome(), () => this.resume());
    this.pushOverlay(ov);
  }
  resume() { this.paused = false; Audio.playMusic('bg'); }
  backToHome() { this.stop(); if (this.cfg.onExit) this.cfg.onExit(); }
  toggleMute() {
    const m = !Audio.musicOn;
    Audio.setMusic(m); Audio.setSound(m);
    this.updateHud();
    toast(m ? '🔊 ব্যাকগ্রাউন্ড সাউন্ড অন' : '🔇 নীরব মোড');
  }

  /* ---------- overlays ---------- */
  pushOverlay(node) { this.overlays.push(node); this.overlayRoot.appendChild(node); }
  clearOverlays() { this.overlays.forEach((n) => n.remove()); this.overlays = []; }

  /* ---------- objectives ---------- */
  objectives(list) {
    if (!this.objectivesEl) return;
    clear(this.objectivesEl);
    if (!Array.isArray(list)) list = [];
    list.forEach((t, i) => {
      const item = el('div', { class: 'obj-item', text: (i + 1) + '. ' + t });
      this.objectivesEl.appendChild(item);
      this.objItems = list;
    });
  }
  markObjective(doneIdx, label) {
    if (!this.objectivesEl) return;
    const items = this.objectivesEl.querySelectorAll('.obj-item');
    if (items[doneIdx]) items[doneIdx].classList.add('done');
    if (label) toast(label);
  }

  /* ---------- HUD ---------- */
  updateHud() {
    if (!this.hudEls || !this.hudEls.left || !this.player) return;
    const s = this.player.stats;
    this.hudEls.left.innerHTML = '';
    this.hudEls.left.append(
      this.chip('🔋', s.energy),
      this.chip('😤', s.frustration),
      this.chip('💰', '৳' + s.money),
      this.chip('🏆', s.score),
      this.powerChip(),
    );
  }
  chip(emoji, val) {
    const c = el('div', { class: 'stat-chip' });
    c.innerHTML = `${emoji} <span class="v">${val}</span>`;
    return c;
  }
  powerChip() {
    const c = el('div', { class: 'stat-chip' });
    c.innerHTML = this.power ? '⚡ <span class="v sparkle">অন</span>' : '🌙 <span class="v">অফ</span>';
    return c;
  }
  /* ---------- screen overlays: dialogs ---------- */
  dialogNode(step, onContinue) {
    this.dialogLock = true;
    this.clearOverlays();
    const dlg = el('div', { class: 'dialog' });
    const isBabu = step.who === 'babu' || step.who === 'boss';
    const charId = WHO_ID[step.who];
    const avatarEl = (charId && Characters.isLoaded(charId))
      ? Characters.avatarNode(charId, step.avatar || (isBabu ? '👴' : '🧑'), isBabu ? 'babu' : '')
      : el('div', { class: 'avatar ' + (isBabu ? 'babu' : ''), text: step.avatar || (isBabu ? '👴' : '🧑') });
    const head = el('div', { class: 'dlg-head' }, [
      avatarEl,
      el('div', {}, [
        el('div', { class: 'dlg-name', text: step.name || (isBabu ? 'পাওয়ার বাবু' : 'আপনি') }),
        el('div', { class: 'dlg-role', text: step.role || '' }),
      ]),
    ]);
    const body = el('div', { class: 'dlg-text', text: step.text });
    const box = el('div', { class: 'dlg-box' }, [head, body]);
    Audio.cardboard();
    if (step.choices) {
      const choices = el('div', { class: 'dlg-choices' });
      step.choices.forEach((c) => {
        const b = el('button', { class: 'choice', onclick: () => { vibrate(12); this.clearOverlays(); this.dialogLock = false; c.onPick(); } }, [
          el('span', { class: 'cico', text: c.ico || '➡️' }),
          el('span', { text: c.label }),
        ]);
        choices.appendChild(b);
      });
      box.appendChild(choices);
    } else {
      const go = el('button', { class: 'btn btn-sm btn-primary dlg-continue', text: 'চালিয়ে যান ▸', onclick: () => { vibrate(10); onContinue(); } });
      box.appendChild(go);
    }
    dlg.appendChild(box);
    this.clearOverlays();
    this.pushOverlay(dlg);
  }

  prompt(text) {
    this.showLines([{ who: 'npc', name: 'খাম্বার পরামর্শ', text }]);
  }

  showLines(lines, onEnd) {
    this.dialogLock = true;
    let i = 0;
    const build = () => {
      const step = lines[i];
      if (!step) { this.closeDialog(); if (onEnd) onEnd(); return; }
      this.dialogNode(step, () => { i++; build(); });
    };
    build();
  }
  closeDialog() { this.clearOverlays(); this.dialogLock = false; }
  closeCurrentDialog() { this.clearOverlays(); this.dialogLock = false; }

  /* Wait/typing feedback */
  thinking(text) {
    this.clearOverlays();
    const dlg = el('div', { class: 'dialog' });
    const box = el('div', { class: 'dlg-box dlg-think' }, [
      el('div', { class: 'dlg-text', text: text || '… ' }),
    ]);
    dlg.appendChild(box);
    this.pushOverlay(dlg);
  }

  /* ---------- finish level ---------- */
  finish(opts = {}) {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.clearOverlays();
    this.dialogLock = false;
    const s = this.player.stats;
    const score = opts.score != null ? opts.score : computeScore(s);
    const result = resultScreen({
      title: opts.title,
      subtitle: opts.subtitle,
      rank: opts.rank,
      score,
      stats: Object.assign(s, { money: s.moneySpent || s.money }),
      onReplay: opts.onReplay,
      onNext: opts.onNext,
      nextEnabled: opts.nextEnabled,
      onLevelSelect: opts.onLevelSelect !== undefined ? opts.onLevelSelect : (this.onLevelSelect || null),
      onMenu: () => this.backToHome(),
    });
    this.pushOverlay(result);
    Audio.win();
    this.lastResult = { ...s, score };
  }

  /* ---------- render ---------- */
  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const bg = ctx.createLinearGradient(0, 0, 0, this.H);
    bg.addColorStop(0, '#1c2745');
    bg.addColorStop(1, '#0b1020');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.save();
    ctx.translate(-Math.round(this.cam.x), -Math.round(this.cam.y));

    if (this.cfg.render) this.cfg.render(ctx, this);
    if (this.cfg.decorate) this.cfg.decorate(ctx, this);
    this.drawObjects(ctx);
    this.drawPlayer(ctx);

    ctx.restore();

    if (!this.power) this.darkOverlay();
    this.vignette();

    /* power ON/OFF transition flash */
    if (this.flashT > 0) {
      const full = this.flashOn ? 0.45 : 0.6;
      const a = Math.max(0, this.flashT / full);
      ctx.fillStyle = this.flashOn
        ? `rgba(255,244,200,${(0.3 * a).toFixed(3)})`
        : `rgba(2,4,10,${(0.5 * a).toFixed(3)})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  drawObjects(ctx) {
    for (const o of this.objects) if (o.render) o.render(ctx, this);
    const near = this.nearbyObject();
    if (near && near.renderHint && !this.dialogLock) near.renderHint(ctx, this);
  }

  drawGround(ctx) {
    ctx.fillStyle = '#1b2740';
    ctx.fillRect(0, 0, this.world.w, this.world.h);
    ctx.fillStyle = '#232f3f';
    ctx.fillRect(0, this.world.h - 260, this.world.w, 260);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 22]);
    ctx.beginPath();
    ctx.moveTo(0, this.world.h - 120);
    ctx.lineTo(this.world.w, this.world.h - 120);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /* ---------- player ---------- */
  drawPlayer(ctx) {
    const p = this.player;
    /* drawn through the reusable character registry:
       uses assets/characters/player.png when present,
       otherwise the procedural vector citizen — identical silhouette. */
    Characters.draw('player', ctx, p.x, p.y, {
      facing: p.facing,
      moving: p.moving,
      walkT: p.walkT,
      talking: !!this.dialogLock,
      idleT: this.time,
    });
  }

  darkOverlay() {
    const ctx = this.ctx;
    const p = this.player;
    const sx = p.x - this.cam.x;
    const sy = p.y - this.cam.y;
    /* subtle candle-flicker so the blackout feels alive, not flat */
    const flicker = 0.92 + Math.sin(this.time * 7.3) * 0.05 + Math.sin(this.time * 13.1) * 0.03;
    const g = ctx.createRadialGradient(sx, sy, 70 * flicker, sx, sy, 470 * flicker);
    g.addColorStop(0, 'rgba(4,6,14,0.04)');
    g.addColorStop(0.55, 'rgba(6,9,22,0.5)');
    g.addColorStop(1, 'rgba(3,5,12,0.88)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);
    /* cold moonlight tint */
    ctx.fillStyle = 'rgba(16,24,64,0.16)';
    ctx.fillRect(0, 0, this.W, this.H);
  }

  vignette() {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.4, this.W / 2, this.H / 2, this.H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);
  }
}

/* ===== module-level drawing & scoring helpers (used by levels) ===== */

export function drawPole(ctx, x, y, eng, opts = {}) {
  const h = opts.h || 120;
  const color = opts.color || '#55689e';
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(x, y + 40, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x - 4, y - h, 8, h + 36);
  ctx.fillRect(x - 18, y - h + 6, 36, 5);
  ctx.fillRect(x - 18, y - h + 18, 36, 4);
  ctx.fillStyle = '#7f8eb8';
  ctx.beginPath(); ctx.arc(x, y - h - 2, 6, 0, Math.PI * 2); ctx.fill();
  if (opts.light) drawBulb(ctx, x, y - h + 10, eng && eng.power);
  if (opts.baseColor) { ctx.fillStyle = opts.baseColor; ctx.fillRect(x - 22, y - 4, 44, 10); }
  if (opts.label) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '12px Hind Siliguri, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opts.label, x, y + 56);
  }
}

export function drawBulb(ctx, x, y, on) {
  ctx.fillStyle = on ? '#fff7cf' : '#30374f';
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
  if (on) {
    ctx.fillStyle = 'rgba(255,238,150,0.4)';
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
  }
}

export function hintRing(ctx, eng, x, y, radius = 54, label) {
  if (eng.dialogLock) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  if (label) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 13px Hind Siliguri, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - radius - 8);
  }
}

export function computeScore(s) {
  const base = 1000;
  const failures = Math.round((s.frustration || 0) * 5);
  const outagePenalty = Math.floor((s.outageTime || 0) / 10);
  const spentPenalty = (s.moneySpent || 0);
  const polesBonus = (s.polesChecked || 0) * 60;
  const complaintBonus = (s.complaints || 0) * 40;
  const objectiveBonus = (s.objectives || 0) * 120;
  const score = Math.max(0, Math.round(base + polesBonus + complaintBonus + objectiveBonus - failures - outagePenalty - spentPenalty));
  return score;
}

export function rankFor(score) {
  if (score >= 5000) return '🏆 মহান ভোগান্তি রাজা';
  if (score >= 3000) return '🥇 অপেক্ষার অভিজ্ঞ';
  if (score >= 1500) return '🥈 কনফিউজড তবে সৎ';
  return '🥉 নতুন ভুক্তভোগী';
}