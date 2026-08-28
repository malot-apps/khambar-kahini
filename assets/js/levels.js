/* ============ levels.js — All 5 Levels ============ */
import { toast, clamp, randInt, pick } from './utils.js';
import { Audio } from './audio.js';
import { Characters } from './characters.js';
import { drawPole, drawBulb, hintRing, computeScore, rankFor } from './engine.js';
import { POLES, WAITING_MESSAGES, L4_LOCATIONS, L4_EVENTS, L1_OBJECTIVES, L1_NPC_LINES } from './data.js';

/* ---------------- shared small helpers ---------------- */
function say(eng, step, onEnd) {
  eng.dialogNode(step, () => { if (onEnd) onEnd(); else eng.closeDialog(); });
}
function ask(eng, step) {
  eng.dialogLock = true;
  eng.dialogNode(step, () => {});
}
function buyText() { return '৳'; }

function drawBuilding(ctx, x, y, w, h, color, name, roof) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(x, y + h + 8, w / 2 + 6, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, 6); ctx.fill();
  if (roof === 'triangle') {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x, y - h - 30); ctx.lineTo(x + w / 2, y - h); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x - w / 2, y - h - 4, w, 7);
  }
  ctx.fillStyle = 'rgba(12,26,40,0.9)';
  for (let i = 0; i < 2; i++) {
    ctx.fillRect(x - w / 2 + 8, y - h + 16 + i * 26, 14, 14);
    ctx.fillRect(x + w / 2 - 22, y - h + 16 + i * 26, 14, 14);
  }
  if (name) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 12px Hind Siliguri, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y - h - (roof === 'triangle' ? 38 : 12));
  }
}

function makePoleObj(p) {
  const width = 16;
  return {
    id: p.id,
    x: p.x, y: p.y || 540,
    label: p.label, emoji: p.emoji, type: p.type,
    clue: !!p.clue, problem: !!p.problem, fix: p.fix, line: p.line,
    lines: p.lines || null,
    visited: false, fixed: false,
    render: function (ctx, eng) {
      drawPole(ctx, this.x, this.y, eng, {
        color: this.fixed ? '#43c98a' : (this.problem && !this.fixed ? '#c14a4a' : '#55689e'),
        light: this.type === 'normal',
      });
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '600 12px Hind Siliguri, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, this.x, this.y + 58);
    },
    renderHint: function (ctx, eng) { hintRing(ctx, eng, this.x, this.y); },
  };
}

/* Ambient NPC drawn through the character registry (sprite or vector fallback). */
function makeNpcObj(id, x, y) {
  const def = Characters.getDef(id);
  const lines = (L1_NPC_LINES && L1_NPC_LINES[id]) || [];
  return {
    id, x, y, label: def.name, emoji: def.avatar,
    render: function (ctx, e) {
      Characters.draw(id, ctx, this.x, this.y, { facing: 1, idleT: e.time, talking: !!e.dialogLock });
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '600 11px "Hind Siliguri", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, this.x, this.y + 44);
    },
    renderHint: function (ctx, e) { hintRing(ctx, e, this.x, this.y, 46); },
    onInteract: (o, eng) => {
      if (!o.talked) {
        o.talked = true;
        eng.player.stats.score += 15;
        eng.updateHud();
      }
      say(eng, { who: id, name: def.name, role: def.role, avatar: def.avatar, text: pick(lines.length ? lines : ['“কারেন্ট তো রহস্যই রে ভাই!”']) });
    },
  };
}

/* =========================================================
   LEVEL 1 — "খামাটা কোথায়?"
   ========================================================= */
export function level1(eng, cb) {
  const state = { done: false };
  const fixed = new Set();
  const clued = new Set();

  const poles = POLES.map((p) => ({
    ...makePoleObj(p),
    onInteract: (o) => handlePole(o),
  }));
  const teaNpc = makeNpcObj('tea_seller', 1120, 660);
  const rickNpc = makeNpcObj('rickshaw', 500, 700);

  function handlePole(o) {
    if (state.done) { say(eng, { who: 'thought', text: 'সব ঠিক হয়ে গেছে — এখন শুধু বিলের অপেক্ষা!' }); return; }
    if (!o.visited) {
      o.visited = true;
      eng.player.stats.polesChecked += 1;
      eng.player.stats.score += 10;
      eng.updateHud();
    }
    const text = pick((o.lines && o.lines.length) ? o.lines : [o.line]);
    if (o.problem && !fixed.has(o.id)) {
      ask(eng, {
        who: 'pole', avatar: o.emoji, name: o.label, role: 'ভাঙা খাম্বা',
        text,
        choices: [
          { label: '🔧 ধীরে ঠিক করো', ico: '🔧', onPick: () => fixPole(o) },
          { label: 'পরের জন্য রেখে দাও', ico: '➡️', onPick: () => eng.closeDialog() },
        ],
      });
    } else if (o.clue && !clued.has(o.id)) {
      ask(eng, {
        who: 'pole', avatar: o.emoji, name: o.label, role: 'রহস্যময় খাম্বা',
        text,
        choices: [
          { label: '🔍 ক্লু জমানো', ico: '🔍', onPick: () => takeClue(o) },
          { label: 'আরেকবার চেক', ico: '👀', onPick: () => eng.closeDialog() },
        ],
      });
    } else {
      say(eng, { who: 'pole', avatar: o.emoji, name: o.label, role: 'খাম্বা', text });
    }
    syncObjectives();
  }

  /* keep the on-screen objective checklist in sync with progress */
  function syncObjectives() {
    const s = eng.player.stats;
    if (s.polesChecked >= POLES.length) eng.markObjective(0);
    if (fixed.size >= 2) eng.markObjective(1);
    if (clued.size >= 1) eng.markObjective(2);
  }

  function fixPole(o) {
    if (fixed.has(o.id)) return;
    fixed.add(o.id);
    fixedPole(o);
    o.fixed = true;
    eng.player.stats.moneySpent += 10;
    eng.player.stats.score += 60;
    toast('🔧 খাম্বা ঠিক! তার এখন ঝরঝরে');
    Audio.click();
    syncObjectives();
    checkWin();
  }
  function fixedPole() {}
  function takeClue(o) {
    if (clued.has(o.id)) return;
    clued.add(o.id);
    o.cluedGet = true;
    eng.player.stats.score += 80;
    toast('🧭 ক্লু: "দুটো টিপু ঠিক হলে লাইন খুলবে"');
    Audio.click();
    syncObjectives();
    checkWin();
  }
  function checkWin() {
    if (fixed.size >= 2 && clued.size >= 1 && !state.done) {
      state.done = true;
      Audio.win();
      winSequence();
    }
  }
  function winSequence() {
    eng.setPower(true);
    eng.markObjective(3);
    say(eng, {
      who: 'narrator', name: 'কথক', role: 'লেভেল ১',
      text: 'দুটো ভাঙা খাম্বা ঠিক, ক্লু হাতে — লাইন এখন সোজা! বিদ্যুৎ ফিরে এলো! Level 1 শেষ।',
    }, () => finishL1());
  }
  function finishL1() {
    const s = eng.player.stats;
    s.objectives = 2;
    s.score = computeScore(s);
    eng.finish({
      title: '⚡ রাস্তায় আবার কারেন্ট?',
      rank: rankFor(s.score),
      stats: s,
      score: s.score,
      onReplay: () => cb.replay(1),
      onNext: () => cb.next(2),
      nextEnabled: true,
    });
  }

  return {
    worldW: 1450, worldH: 820, playerStart: { x: 90, y: 620 }, playerSpeed: 175,
    powerOn: true, frustrateOnDark: false,
    objectives: L1_OBJECTIVES,
    objects: [...poles, teaNpc, rickNpc],
    update() {},
    render(ctx, eng) {
      eng.drawGround(ctx);
      drawBuilding(ctx, 300, 615, 200, 175, '#2a5e8e', 'মুদি ভান্ডার', 'triangle');
      drawBuilding(ctx, 650, 610, 170, 140, '#3a5a86', 'মিষ্টি ভান্ড', 'flat');
      drawBuilding(ctx, 960, 615, 200, 150, '#32527a', 'সেলুন', 'triangle');
      drawBuilding(ctx, 1280, 620, 180, 130, '#2b3b63', 'ইলেকট্রিক শোয়ারুম', 'flat');
      drawBulb(ctx, 170, 320, eng.power);
      drawBulb(ctx, 700, 320, eng.power);
      drawBulb(ctx, 1250, 320, eng.power);
    },
    onExit: () => cb.exit(),
  };
}

function drawSwitch(ctx, x, y, on) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(x, y + 22, 24, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a5a2a';
  ctx.beginPath(); ctx.roundRect(x - 24, y - 26, 48, 48, 8); ctx.fill();
  ctx.fillStyle = '#3a2c14';
  ctx.beginPath(); ctx.roundRect(x - 16, y - 18, 11, 30, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + 5, y - 18, 11, 30, 3); ctx.fill();
  ctx.fillStyle = on ? '#43e97b' : '#c14a4a';
  ctx.beginPath(); ctx.arc(x - 10, on ? y - 12 : y + 8, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 11, on ? y + 8 : y - 12, 5, 0, Math.PI * 2); ctx.fill();
}

/* =========================================================
   LEVEL 2 — "কারেন্ট আসছো!"
   Timed power windows; flip 3 switches.
   ========================================================= */
export function level2(eng, cb) {
  const state = {
    done: false, switched: 0, timeLeft: 55,
    powerTimer: 6, target: 3,
  };
  const tasks = [
    { x: 360, y: 460, label: 'ফ্যান-চালু সুইচ', on: false },
    { x: 760, y: 460, label: 'বাতির সুইচ', on: false },
    { x: 1140, y: 460, label: 'ফিউজ প্রযুন্ন', on: false },
  ];
  state.doneRoot = tasks;

  function win2() {
    state.done = true;
    Audio.win();
    say(eng, { who: 'narrator', name: 'কথক', text: 'সব সুইচ উজ্জ্বল — কারেন্ট স্টেডি! লেভেল 2 শেষ।' }, () => finish2());
  }

  function finish2() {
    const s = eng.player.stats;
    s.objectives = 3;
    s.score = computeScore(s);
    eng.finish({ title: 'একটু তো ঠিকই ছিল না!', stats: s, score: s.score, rank: rankFor(s.score), onReplay: () => cb.replay(2), onNext: () => cb.next(3), nextEnabled: true });
  }

  // Convert base switches object used in config
  const taskObjs = tasks.map((t, i) => ({
    x: t.x, y: t.y, label: t.label,
    on: false,
    render: function (ctx, eng) {
      drawSwitch(ctx, this.x, this.y, this.on);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '12px Hind Siliguri, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, this.x, this.y + 50);
    },
    renderHint: function (ctx, eng) { hintRing(ctx, eng, this.x, this.y); },
    onInteract: (o) => flip(o),
  }));
  function flip(o) {
    if (state.done) return;
    if (!eng.power) { toast('🌙 কারেন্ট নাই — সুইচ টিপলেও কাজ হবে না'); return; }
    if (o.on) { toast('এই সুইচ আগেই চালু!'); return; }
    o.on = true; state.switched++;
    eng.player.stats.score += 30;
    state.fx = state.fx || [];
    state.fx.push({ x: o.x, y: o.y - 10, t: 0 });
    toast(`✅ সুইচ চালু (${state.switched}/3)`);
    Audio.click();
    if (state.switched >= 3) win2();
  }

  let lossTimer = null;
  function lose2() {
    if (state.done) return;
    state.done = true;
    say(eng, { who: 'thought', text: 'সময় শেষ — কারেন্ট না আসেই ম্যাপ রিফ্রেশ!' }, () => cb.replay(2));
  }

  return {
    worldW: 1400, worldH: 820, playerStart: { x: 220, y: 640 }, playerSpeed: 190,
    powerOn: true, frustrateOnDark: true,
    objects: taskObjs,
    update(dt) {
      if (state.done) return;
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) { state.timeLeft = 0; lose2(); return; }
      state.powerTimer -= dt;
      if (state.powerTimer <= 0) {
        eng.setPower(!eng.power);
        const dur = eng.power ? 5 + randInt(0, 4) : 7 + randInt(0, 6);
        state.powerTimer = dur;
        toast(eng.power ? '⚡ কারেন্ট আসলো! সুইচ টিপুন!' : '🌙 কারেন্ট গেলো! আবার চেষ্টা');
      }
      if (state.fx && state.fx.length) state.fx = state.fx.filter((f) => (f.t += dt) < 0.5);
    },
    render(ctx, eng) {
      eng.drawGround(ctx);
      drawBuilding(ctx, 480, 600, 200, 160, '#2a5e8e', 'বাসা', 'triangle');
      drawBuilding(ctx, 960, 620, 220, 140, '#3a5a86', 'দোকান', 'flat');
      // level timer chip
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.roundRect(20, 90, 170, 36, 10); ctx.fill();
      ctx.fillStyle = state.timeLeft < 10 ? '#ff6b6b' : '#fff';
      ctx.font = '700 16px "Hind Siliguri", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('⏱ ' + Math.max(0, Math.ceil(state.timeLeft)) + 's', 30, 114);
      ctx.fillStyle = state.timeLeft < 10 ? '#ff6b6b' : '#43e97b';
      ctx.beginPath(); ctx.roundRect(20, 130, Math.max(0, 170 * Math.min(1, state.timeLeft / 30)), 6, 3); ctx.fill();
      // power-window countdown feedback
      const secs = Math.max(0, state.powerTimer).toFixed(1);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.roundRect(eng.world.w / 2 - 120, 20, 240, 42, 12); ctx.fill();
      ctx.fillStyle = eng.power ? '#43e97b' : '#ff6b6b';
      ctx.font = '700 17px "Hind Siliguri", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(eng.power ? `⚡ কারেন্ট আছে — ${secs}s` : `🌙 কারেন্ট ফিরবে — ${secs}s`, eng.world.w / 2, 47);
      // switch spark fx
      (state.fx || []).forEach((f) => {
        ctx.strokeStyle = `rgba(255,224,130,${Math.max(0, 0.85 - f.t * 1.7).toFixed(3)})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, 6 + f.t * 70, 0, Math.PI * 2); ctx.stroke();
      });
    },
    onExit: () => cb.exit(),
  };
}

/* ===== LEVEL 3 — "অভিযোগ অফিস" (পাওয়ার বাবু) ===== */
export function level3(eng, cb) {
  const st = {
    phase: 'lobby', started: false, done: false,
    waiting: 0, waitT: 0, bossHit: 0,
    lastMsg: WAITING_MESSAGES[0],
  };
  const desk = {
    x: 660, y: 470, label: 'অভিযোগ কাউন্টার',
    render: function (ctx, e) {
      /* Power Babu (fictional) stands behind the counter, talking while dialogs are open */
      Characters.draw('power_babu', ctx, this.x - 40, this.y - 36, { facing: 1, idleT: e.time, talking: !!e.dialogLock });
      drawDesk(ctx, this.x, this.y);
      drawBulb(ctx, this.x + 110, this.y - 120, e.power);
    },
    renderHint: function (ctx, e) { hintRing(ctx, e, this.x, this.y); },
    onInteract: () => {
      if (st.done) return;
      if (!st.started) startOffice();
      else if (st.phase === 'lobby') startOffice();
      else if (st.phase === 'menu') menu();
      else menu();
    },
  };
  const cabinet = {
    x: 1150, y: 520, label: 'ফাইল ক্যাবিনেট',
    render: function (ctx, e) {
      ctx.fillStyle = '#6b5a34';
      ctx.beginPath(); ctx.roundRect(this.x - 40, this.y - 70, 80, 90, 6); ctx.fill();
      ctx.fillStyle = '#4a3c22'; ctx.fillRect(this.x - 40, this.y - 70, 80, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '12px Hind Siliguri, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('ফাইল-১০০১', this.x, this.y + 40);
    },
    renderHint: function (ctx, e) { hintRing(ctx, e, this.x, this.y); },
    onInteract: () => lookFile(),
  };

  function line(step, next) {
    eng.dialogLock = true;
    eng.dialogNode(step, next || (() => eng.closeDialog()));
  }
  function chain(list, last) {
    let i = 0;
    (function go() {
      if (i >= list.length) { if (last) last(); return; }
      line(list[i++], go);
    })();
  }
  function menu() {
    eng.dialogLock = true;
    eng.dialogNode({
      who: 'babu', text: 'আপনি কী নেবেন?',
      choices: [
        { label: 'প্ল্যানটা কী?', ico: '📜', onPick: () => { incWait(1); reply('এটা খুব গোপন প্ল্যান। আগে অপেক্ষা করুন।'); } },
        { label: 'কতক্ষণ অপেক্ষা?', ico: '⏳', onPick: () => { incWait(2); reply('সময় বলা কঠিন… তবে অপেক্ষা করা সহজ।'); } },
        { label: 'আবার অভিযোগ', ico: '📣', onPick: () => { incWait(1); reply('অভিযোগ নোট হলো… অপেক্ষা করুন।'); } },
        { label: 'বসের মুকাবিলা', ico: '👔', onPick: () => { if (st.waiting < 3) { incWait(1); reply('আগে আরেকটু অপেক্ষা…'); } else bossIntro(); } },
      ],
    }, () => {});
  }
  function reply(t) { say(eng, { who: 'babu', text: t }); }
  function incWait(n) {
    st.waiting += n;
    eng.player.stats.frustration = Math.min(100, eng.player.stats.frustration + 5);
    eng.player.stats.complaints += 1;
    st.lastMsg = pick(WAITING_MESSAGES);
    Audio.cardboard();
  }

  function startOffice() {
    if (st.done) return;
    st.started = true;
    chain([
      { who: 'you', text: 'স্যার, এলাকায় অনেকক্ষণ ধরে কারেন্ট নাই।' },
      { who: 'babu', text: 'একটু অপেক্ষা করুন… ফাইলটা কই?' },
    ], () => {
      /* cinematic pause — the sacred office rhythm before the famous line */
      eng.thinking('✍️ … ট্যাক ট্যাক … স্ট্যাম্প, চা, আর ফাইল-১০০১ খোঁজা হচ্ছে …');
      setTimeout(() => {
        Audio.playPowerBabuVoice(() => {
          st.phase = 'menu';
          chain([{ who: 'babu', text: 'আমাদের প্ল্যান আছে… আগে আর একটু অপেক্ষা করুন।' }], () => menu());
        });
      }, 900);
    });
  }
  function lookFile() {
    incWait(1);
    line({
      who: 'document', name: 'ফাইল-১০০১', role: 'গোপন নথি',
      text: '"যতক্ষণ লোক অপেক্ষা করে, প্ল্যান তত সত্যি।"',
    }, () => menu());
  }

  /* ---------- boss (comic, non-violent) ---------- */
  const BOSS_Q = [
    { q: 'মুকাবিলা-১: অপেক্ষায় রাখবেন (Wait Attack)। কী করবেন?', ok: 'ধৈর্য, নোট জমা', bad: 'চেয়ার ভাঙা' },
    { q: 'মুকাবিলা-২: ফাইলের ঝড় (File Attack)। কী?', ok: 'রিসিট ও প্রমাণ দেখাও', bad: 'কাগজ ছোড়ো' },
    { q: 'মুকাবিলা-৩: "আজ কারেন্ট আসবে" (Announcement)।', ok: 'রেকর্ড ধরে অপেক্ষা', bad: 'লাফালাফি' },
    { q: 'মুকাবিলা-৪: সব বাতি নিভে গেলো (Loadshedding)।', ok: 'লণ্ঠন জ্বালো', bad: 'অন্ধকারে দৌড়ো' },
    { q: 'মুকাবিলা-৫: সিস্টেম ব্যস্ত। কী?', ok: 'চা আর অপেক্ষা', bad: 'রিবুট চিৎকার' },
  ];
  function bossIntro() {
    st.phase = 'boss';
    chain([
      { who: 'boss', name: 'পাওয়ার বাবু', text: 'প্রমাণ ছাড়া ধৈর্য নয়! ৫টি মুকাবিলা দিয়ে জয় নাও।' },
    ], () => bossRound(0));
  }
  function bossRound(i) {
    if (st.done) return;
    const a = BOSS_Q[i];
    if (!a) { bossWin(); return; }
    eng.dialogLock = true;
    eng.dialogNode({
      who: 'boss', name: 'পাওয়ার বাবু', avatar: '👴',
      text: a.q,
      choices: [
        { label: '✅ ' + a.ok, onPick: () => { st.bossHit++; eng.player.stats.score += 120; Audio.win(); toast('✅ মুকাবিলা জিতলেন!'); setTimeout(() => bossRound(i + 1), 160); } },
        { label: '❌ ' + a.bad, onPick: () => { eng.player.stats.frustration = Math.min(100, eng.player.stats.frustration + 14); Audio.lose(); toast('ফ্রাস্ট্রেশন +১৪, আবার চেষ্টা'); setTimeout(() => bossRound(i), 160); } },
      ],
    }, () => {});
  }
  function bossWin() {
    st.done = true;
    Audio.win();
    line({
      who: 'narrator', name: 'কথক',
      text: 'ধৈর্য ও প্রমাণে পাওয়ার বাবুর শেষ! অফিস শেষ।',
    }, () => finish3());
  }
  function finish3() {
    const s = eng.player.stats;
    s.objectives = 4;
    s.score = computeScore(s);
    eng.finish({
      title: '🎉 জয় — অভিযোগ কোথাও পৌঁছায়!',
      rank: rankFor(s.score), stats: s, score: s.score,
      onReplay: () => cb.replay(3),
      onNext: () => cb.next(4),
      nextEnabled: true,
    });
  }

  return {
    worldW: 1300, worldH: 820, playerStart: { x: 420, y: 700 }, playerSpeed: 180,
    powerOn: true, frustrateOnDark: false,
    objects: [desk, cabinet],
    update(dt) {
      if (st.started && !st.done) {
        st.waitT = (st.waitT || 0) + dt;
        if (st.waitT > 3) { st.waitT = 0; st.lastMsg = pick(WAITING_MESSAGES); }
      }
    },
    render(ctx, e) {
      ctx.fillStyle = '#191d2e'; ctx.fillRect(0, 0, e.world.w, e.world.h);
      ctx.fillStyle = '#2b2e40'; ctx.fillRect(0, 620, e.world.w, e.world.h - 620);
      drawBuilding(ctx, 300, 700, 320, 110, '#333a50', 'হল', 'flat');
      drawOfficeWall(ctx, e);
      drawWaitMeter(ctx, e.world.w, st);
    },
    onExit: () => cb.exit(),
  };
}

function drawDesk(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(x, y + 30, 84, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b4a26'; ctx.fillRect(x - 84, y - 8, 168, 40);
  ctx.fillStyle = '#8a6633'; ctx.fillRect(x - 84, y - 26, 168, 18);
  // papers + stamp on the desk
  ctx.fillStyle = '#f4ead2';
  ctx.beginPath(); ctx.roundRect(x + 18, y - 24, 34, 22, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(160,40,40,0.65)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(x + 35, y - 13, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#6b4a26';
  ctx.font = '600 11px "Hind Siliguri", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('পাওয়ার বাবু (কাল্পনিক)', x, y + 58);
}

function drawWaitMeter(ctx, W, s) {
  const w = 320, x = W / 2 - w / 2, y = 12;
  const pct = clamp((s.waiting || 0) / 8, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(x - 8, y - 4, w + 16, 50, 10); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '13px Hind Siliguri, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(s.lastMsg || 'অপেক্ষা…', W / 2, y + 10);
  ctx.fillStyle = '#23304f';
  ctx.beginPath(); ctx.roundRect(x, y + 20, w, 16, 8); ctx.fill();
  ctx.fillStyle = '#ffb04a';
  ctx.beginPath(); ctx.roundRect(x, y + 20, w * pct, 16, 8); ctx.fill();
}

function drawOfficeWall(ctx, e) {
  // wall band + floor
  ctx.fillStyle = '#141a2c';
  ctx.fillRect(0, 0, e.world.w, 110);
  ctx.fillStyle = '#1b2340';
  ctx.fillRect(0, 110, e.world.w, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2;
  for (let x = 0; x < e.world.w; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 124); ctx.lineTo(x - 40, e.world.h); ctx.stroke();
  }
  // signboard
  ctx.fillStyle = '#20284a';
  ctx.beginPath(); ctx.roundRect(e.world.w / 2 - 230, 16, 460, 52, 12); ctx.fill();
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(e.world.w / 2 - 230, 16, 460, 52, 12); ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '700 17px "Hind Siliguri", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏛️ অভিযোগ কার্যালয় — এখানে অপেক্ষাই কাজ!', e.world.w / 2, 50);
  // wall clock — always a little late, like everything here
  const cx = e.world.w / 2 + 290;
  ctx.fillStyle = '#232c52';
  ctx.beginPath(); ctx.arc(cx, 40, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd24a';
  ctx.beginPath(); ctx.arc(cx, 40, 22, 0, Math.PI * 2); ctx.stroke();
  const ang = Math.PI / 3 + Math.sin(e.time || 0) * 0.05;
  ctx.beginPath(); ctx.moveTo(cx, 40); ctx.lineTo(cx + Math.cos(ang) * 12, 40 + Math.sin(ang) * 12); ctx.stroke();
}

/* ===== LEVEL 4 — "লোডশেডিং চ্যালেঞ্জ" ===== */
export function level4(eng, cb) {
  const st = { done: false, got: 0, time: 60, battery: 100 };
  const goals = L4_LOCATIONS.slice(0, 3).map((g) => ({
    x: g.x, y: 560, label: g.label, need: g.need, got: false,
    render: function (ctx, e) {
      ctx.fillStyle = this.got ? '#2fae62' : '#3a517d';
      ctx.beginPath(); ctx.roundRect(this.x - 34, this.y - 30, 68, 44, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '600 12px Hind Siliguri, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(this.got ? '✔' : this.label, this.x, this.y + 4);
      if (!this.got) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '11px Hind Siliguri, sans-serif'; ctx.fillText('কাছাকাছি যাও', this.x, this.y - 38); }
    },
    renderHint: function (ctx, e) { hintRing(ctx, e, this.x, this.y); },
    onInteract: (o) => visit(o),
  }));

  const office = {
    x: 1240, y: 560, label: 'অভিযোগ অফিস',
    render: function (ctx, e) { drawBuilding(ctx, this.x, 620, 150, 130, '#2b3b63', 'অফিস', 'triangle'); },
    renderHint: function (ctx, e) { if (st.got >= 3) hintRing(ctx, e, this.x, 560); },
    onInteract: () => { if (st.got >= 3) winOffice(); else toast('আগে সব লোকেশন ঠিক করো!'); },
  };

  const hazard = {
    x: 780, y: 500, label: 'ঝাঁকুনি লাইন',
    render: function (ctx, e) { drawPole(ctx, this.x, this.y, e, { color: '#b44', light: false }); ctx.fillStyle = 'rgba(255,120,120,0.85)'; ctx.font = '12px Hind Siliguri'; ctx.textAlign = 'center'; ctx.fillText('⚠️ ঝুঁকি', this.x, this.y - 100); },
    renderHint: function (ctx, e) {
      hintRing(ctx, e, this.x, this.y);
      ctx.strokeStyle = `rgba(255,90,90,${(0.35 + 0.25 * Math.sin(performance.now() / 180)).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(this.x, this.y, 40 + Math.sin(performance.now() / 180) * 4, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    },
    onInteract: () => { if (st.done) return; st.battery = Math.max(0, st.battery - 30); toast('💥 ঝাঁকুনি! ব্যাটারি -৩০'); Audio.lose(); eng.player.stats.frustration = Math.min(100, eng.player.stats.frustration + 15); },
  };

  function visit(o) {
    if (st.done) return;
    if (o.got) { toast('✅ ' + o.label + ' ইতিমধ্যে ঠিক'); return; }
    o.got = true; st.got++;
    eng.player.stats.score += 100;
    toast('✅ ' + o.label + ' ঠিক (' + st.got + '/3)');
    Audio.click();
    if (st.got >= 3) toast('🏛️ এখন অভিযোগ অফিসে যান!');
  }
  function winOffice() {
    st.done = true;
    Audio.win();
    say(eng, { who: 'narrator', name: 'কথক', text: 'অন্ধকারে সবকিছু ঠিক করে, অফিসে শেষ অভিযোগ! লেভেল 4 শেষ।' }, () => finish4());
  }
  function finish4() {
    const s = eng.player.stats;
    s.objectives = 5;
    s.battery = Math.round(st.battery);
    s.score = computeScore(s);
    eng.finish({ title: '🌑 অন্ধকারে জয়', rank: rankFor(s.score), stats: s, score: s.score, onReplay: () => cb.replay(4), onNext: () => cb.next(5), nextEnabled: true });
  }
  function lose4() {
    if (st.done) return;
    st.done = true;
    Audio.lose();
    say(eng, { who: 'thought', text: 'ব্যাটারি শেষ… অন্ধকারে হার!' }, () => cb.replay(4));
  }

  return {
    worldW: 1400, worldH: 820, playerStart: { x: 100, y: 600 }, playerSpeed: 185,
    powerOn: false, frustrateOnDark: true,
    objects: [...goals, office, hazard],
    update(dt) {
      if (st.done) return;
      st.time -= dt;
      st.battery -= dt * 0.6;
      const s = eng.player.stats;
      s.energy = Math.max(0, Math.round(st.battery));
      s.outageTime += dt;
      if (st.battery <= 0 || st.time <= 0) { st.time = 0; lose4(); return; }
      if (s.outageTime > 5 && Math.random() < 0.0009) { toast(pick(L4_EVENTS)); }
    },
    render(ctx, e) {
      e.drawGround(ctx);
      drawBuilding(ctx, 300, 640, 180, 150, '#23335a', 'বাড়ি', 'triangle');
      drawBuilding(ctx, 700, 640, 200, 140, '#1f3055', 'দোকান', 'flat');
      drawBlack(ctx, e, st.battery);
      // battery meter (rounded + low-battery pulse)
      const bw = 200, bx = 20, by = 20;
      const lowB = st.battery <= 25;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.roundRect(bx, by, bw, 34, 10); ctx.fill();
      const frac = Math.max(0, Math.min(1, st.battery / 100));
      ctx.fillStyle = lowB ? '#ff6b6b' : '#5aa7ff';
      ctx.beginPath(); ctx.roundRect(bx + 4, by + 4, Math.max(6, (bw - 8) * frac), 26, 7); ctx.fill();
      if (lowB) {
        ctx.strokeStyle = `rgba(255,107,107,${(0.5 + 0.4 * Math.sin(performance.now() / 150)).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(bx, by, bw, 34, 10); ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.font = '700 14px "Hind Siliguri", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🔋 ' + Math.max(0, Math.round(st.battery)) + '%', bx + 12, by + 22);
      // time-left chip
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.roundRect(bx + bw + 10, by, 110, 34, 10); ctx.fill();
      ctx.fillStyle = st.time < 10 ? '#ff6b6b' : '#fff';
      ctx.fillText('⏱ ' + Math.max(0, Math.ceil(st.time)) + 's', bx + bw + 22, by + 22);
    },
    onExit: () => cb.exit(),
  };
}
/* Blackout atmosphere — the visibility circle shrinks as the battery drains */
function drawBlack(ctx, e, battery = 100) {
  const low = Math.max(0, Math.min(100, battery));
  const radius = 90 + (low / 100) * 360;
  const pulse = low < 25 ? 1 + Math.sin(performance.now() / 160) * 0.05 : 1;
  const g = ctx.createRadialGradient(e.player.x, e.player.y, radius * 0.22 * pulse, e.player.x, e.player.y, radius * pulse);
  g.addColorStop(0, 'rgba(2,4,10,0.03)');
  g.addColorStop(0.6, 'rgba(4,7,18,0.45)');
  g.addColorStop(1, 'rgba(1,2,6,0.92)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, e.world.w, e.world.h);
  /* cold night tint */
  ctx.fillStyle = 'rgba(14,20,60,0.15)'; ctx.fillRect(0, 0, e.world.w, e.world.h);
}

/* ===== LEVEL 5 — "শেষ অভিযোগ" (multi-ending) ===== */
export function level5(eng, cb) {
  const st = { done: false, choice: 0, consulted: 0 };
  const desk = {
    x: 700, y: 470, label: 'চূড়ান্ত কাউন্টার',
    render: function (ctx, e) {
      /* warm spotlight on the final counter when the power is on */
      if (e.power) {
        const g = ctx.createRadialGradient(this.x, this.y - 60, 10, this.x, this.y - 60, 190);
        g.addColorStop(0, 'rgba(255,236,170,0.2)');
        g.addColorStop(1, 'rgba(255,236,170,0)');
        ctx.fillStyle = g;
        ctx.fillRect(this.x - 210, this.y - 270, 420, 330);
      }
      drawBuilding(ctx, this.x, 560, 340, 130, '#2a3760', 'চূড়ান্ত অভিযোগ', 'flat');
      /* the (fictional) director's final counter — Power Babu on duty */
      Characters.draw('power_babu', ctx, this.x - 90, this.y + 10, { facing: 1, idleT: e.time, talking: !!e.dialogLock });
      if (e.power) drawBulb(ctx, this.x + 120, this.y - 130, true);
    },
    renderHint: function (ctx, e) { hintRing(ctx, e, this.x, this.y); },
    onInteract: () => finalScene(),
  };

  function line(step, next) { eng.dialogLock = true; eng.dialogNode(step, next || (() => eng.closeDialog())); }
  function chain(list, last) { let i = 0; (function go() { if (i >= list.length) { if (last) last(); return; } line(list[i++], go); })(); }
  function menu(node) { eng.dialogLock = true; eng.dialogNode(node, () => {}); }

  function finalScene() {
    line({ who: 'you', text: 'সব তথ্য জোগাড় হয়ে গেছে। এবার আপনি পাকা অভিজ্ঞ খাম্বা-নাগরিক!' }, () =>
      chain([
        { who: 'doc', name: 'মহাপরিচালক', text: 'চারটি level-এর সব অভিজ্ঞতা, সব ক্লু — সব জমা হলো আমার টেবিলে।' },
        { who: 'doc', name: 'মহাপরিচালক', text: 'এবার শেষ মৌখিক পরীক্ষা: কারেন্ট ফেরানোর দায়িত্ব আপনার বাক্যে। বলুন।' },
      ], () => finalChoice()));
  }

  function finalChoice() {
    menu({
      who: 'doc', name: 'মহাপরিচালক', avatar: '👴',
      text: 'এই শেষ মৌখিক পরীক্ষা — আপনি যেভাবে সমাধান দেবেন, সেটা দিয়ে শেষ।',
      choices: [
        { label: '🤝 সমঝোতা ও পরিপূর্ণ প্রতিশ্রুতি', ico: '🤝', onPick: () => { st.choice = 3; runEnd(); } },
        { label: '⏳ আরেকবার ধৈর্য', ico: '⏳', onPick: () => { st.choice = 2; runEnd(); } },
        { label: '📢 জোরে অভিযোগ-চিৎকার', ico: '📢', onPick: () => { st.choice = 1; runEnd(); } },
      ],
    });
  }

  function endingText() {
    if (st.choice >= 3) return { t: 'best' };
    return { t: st.choice === 2 ? 'mid' : 'low' };
  }
  function runEnd() {
    st.done = true;
    const end = endingText();
    if (end.t === 'best') {
      chain([
        { who: 'doc', text: 'সঠিক সমঝোতা! পাওয়ার বাবু ঘোষণা করলেন — "ঠিক আছে, কারেন্ট রাতেই ফিরবে!" আর আপনি জিতলেন ধৈর্য দিয়ে।' },
      ], () => doFinish('🎉 মহা সুখী সমাপ্তি', '🏆 ধৈর্যের মহাজয়ী', 'কারেন্ট ফিরলো, পাখি ফিরলো, চা গরমই রইলো!'));
    } else if (end.t === 'mid') {
      chain([
        { who: 'doc', text: 'ধৈর্যের পরীক্ষা পাস — কারেন্ট ফিরলো, তবে ফ্যান এখনো স্লো মোডে। তবু ভালো সমাপ্তি!' },
      ], () => doFinish('😐 সাধারণ সমাপ্তি', '🥈 ধৈর্যশীল নাগরিক', 'অর্ধেক জয়, অর্ধেক অপেক্ষা — এটাই জীবন!'));
    } else {
      chain([
        { who: 'doc', text: 'চিৎকারে ফাইল উড়লো, কারেন্ট আসেনি… তবে আপনার ভোগান্তি-অভিজ্ঞতা আরও বাড়ল।' },
      ], () => doFinish('😅 বিদ্রোহী-হতাশ সমাপ্তি', '🥉 ভোগান্তি-অভিজ্ঞ', 'আবার চেষ্টা করুন — এবার ধৈর্য নিয়ে!'));
    }
  }
  function doFinish(title, rank, subtitle) {
    const s = eng.player.stats;
    s.battery = s.battery || 40;
    s.score = computeScore(s) + st.choice * 150;
    eng.finish({ title, rank, subtitle, stats: s, score: s.score, onReplay: () => cb.replay(5), onNext: null, nextEnabled: false });
  }

  return {
    worldW: 1400, worldH: 820, playerStart: { x: 420, y: 700 }, playerSpeed: 180,
    powerOn: true, frustrateOnDark: false,
    objects: [desk],
    update() {},
    render(ctx, e) {
      e.drawGround(ctx);
      drawBuilding(ctx, 700, 700, 380, 150, '#253157', 'বিদ্যুৎ কার্যালয়', 'triangle');
    },
    onExit: () => cb.exit(),
  };
}