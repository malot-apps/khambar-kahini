/* ============ ui.js — Screens, Menus, Dialog, HUD ============ */
import { el, clear, vibrate, toast } from './utils.js';
import { LEVELS } from './data.js';

export let stageRef = null;
export function setStage(node) { stageRef = node; }

export function mount(screen) {
  if (!stageRef) return;
  clear(stageRef);
  stageRef.appendChild(screen);
}

/* Reusable primary button */
export function makeBtn(label, icon, onClick, cls = '') {
  return el('button', {
    class: `btn ${cls}`,
    onclick: () => { vibrate(14); if (onClick) onClick(); },
  }, [
    el('span', { class: 'ico', text: icon }),
    el('span', { class: 'lbl', text: label }),
    el('span', { class: 'chev', text: '›' }),
  ]);
}

function backRow(title, onBack) {
  return el('div', { class: 'back-row' }, [
    el('button', { class: 'btn btn-icon', onclick: () => { vibrate(12); onBack && onBack(); } }, '←'),
    el('div', { class: 'page-title', text: title }),
    el('div', { style: 'width: 40px' }),
  ]);
}

/* ============ HOME ============ */
export function homeScreen(nav) {
  const s = el('div', { class: 'screen' });
  const inner = el('div', { class: 'screen-inner' });

  const hero = el('div', { class: 'hero' }, [
    el('p', { class: 'eyebrow', text: 'ব্যঙ্গাত্মক ইন্ডি গেম' }),
    el('div', { class: 'hero-art', html: '<svg width="300" height="96" viewBox="0 0 300 96"><rect x="10" y="14" width="92" height="74" rx="9" fill="#2b3a68"/><path d="M22 88 v-18 h16 v18 z" fill="#23304f"/><path d="M78 88 v-18 h16 v18 z" fill="#23304f"/><text x="52" y="72" font-size="40" text-anchor="middle">🏠</text><rect x="196" y="14" width="16" height="80" rx="3" fill="#4a5bb0"/><rect x="196" y="10" width="64" height="12" rx="4" fill="#4a5bb0"/><circle cx="212" cy="34" r="4" fill="#ffe066"/><path d="M150 24 l-24 28 h13 v18 h22 v-18 h13 z" fill="#ffd24a" stroke="#ff9a2e" stroke-width="2"/><path d="M128 20 q22 4 44 0 l-8 6 h-22 z" fill="#7c8cd8"/></svg>' }),
    el('h1', { class: 'title-main', text: 'খাম্বার কাহিনী' }),
    el('p', { class: 'title-sub', text: 'খাম্বা আছে, তার আছে… কারেন্ট কোথায়?' }),
  ]);

  const menu = el('div', { class: 'menu' }, [
    makeBtn('খেলা শুরু', '🎮', () => nav('play'), 'btn-primary'),
    makeBtn('Level নির্বাচন', '🗺️', () => nav('levelselect')),
    makeBtn('কীভাবে খেলব', '📖', () => nav('howto')),
    makeBtn('সেটিংস', '⚙️', () => nav('settings')),
    makeBtn('যা আছে', 'ℹ️', () => nav('about')),
  ]);

  inner.append(hero, menu);
  s.appendChild(inner);
  mount(s);
}

/* ============ LEVEL SELECT ============ */
export function levelSelectScreen(nav, getSave, onStart) {
  const save = getSave();
  const s = el('div', { class: 'screen' });
  const inner = el('div', { class: 'screen-inner' });
  inner.append(backRow('Level নির্বাচন', () => nav('home')));
  const cards = LEVELS.map((lv) => {
    const unlocked = lv.id <= save.unlocked;
    const best = save.bestScore[lv.id];
    const card = el('div', {
      class: `level-card ${unlocked ? '' : 'locked'}`,
      onclick: () => { vibrate(14); if (unlocked) onStart(lv.id); else toast('আগের level শেষ করুন'); },
    }, [
      el('div', { class: 'lnum', text: unlocked ? lv.icon : '🔒' }),
      el('div', { class: 'linfo' }, [
        el('div', { class: 'lname', text: `Level ${lv.id} • ${lv.title}` }),
        el('div', { class: 'ldesc', text: lv.tagline }),
        el('div', { class: 'lstar', text: best ? `⭐ সেরা: ${best}` : 'এখনো খেলেননি' }),
      ]),
      el('div', { class: 'lstar', text: unlocked ? '▶' : '' }),
    ]);
    return card;
  });
  inner.append(...cards);
  s.appendChild(inner);
  mount(s);
}

/* ============ HOW TO PLAY ============ */
export function howToScreen(nav) {
  const s = el('div', { class: 'screen' });
  const inner = el('div', { class: 'screen-inner' });
  inner.append(backRow('কীভাবে খেলবেন', () => nav('home')));
  const p1 = el('div', { class: 'panel' }, [
    el('h3', { text: '🕹️ নিয়ন্ত্রণ' }),
    el('p', { text: '• ডেস্কটপ: তীরচিহ্ন / WASD — চলা; Space / E — ইন্টারঅ্যাক্ট' }),
    el('p', { text: '• মোবাইল: বামে জয়স্টিক, ডানে “যোগাযোগ” বোতাম' }),
  ]);
  const p2 = el('div', { class: 'panel' }, [
    el('h3', { text: '🎯 উদ্দেশ্য' }),
    el('p', { text: '৫টি level পেরিয়ে আলো ফেরানো। কম অপেক্ষা, কম খরচে বেশি পয়েন্ট।' }),
    el('p', { text: 'আর শেষে পাওয়ার বাবুকে জিতিয়ে দিন… মানে, ঠিকমতো অভিযোগ জানান।' }),
  ]);
  const p3 = el('div', { class: 'panel' }, [
    el('h3', { text: '⚡ টিপস' }),
    el('ul', { html: '<li>আলো আসা-যাওয়ার মধ্যে কাজ সারুন</li><li>সব খাম্বা ঘুরে ক্লু জমানো</li><li>ব্যাটারি ও মেজাজ (ফ্রাস্ট্রেশন) নজরে রাখুন</li>' }),
  ]);
  inner.append(p1, p2, p3);
  s.appendChild(inner);
  mount(s);
}

/* ============ SETTINGS ============ */
export function settingsScreen(nav, state, onToggle, onReset) {
  const s = el('div', { class: 'screen' });
  const inner = el('div', { class: 'screen-inner' });
  inner.append(backRow('সেটিংস', () => nav('home')));

  function tog(key, title, sub) {
    return el('div', { class: 'toggle-row' }, [
      el('div', {}, [ el('div', { class: 'tl', text: title }), el('div', { class: 'ts', text: sub }) ]),
      el('label', { class: 'switch' }, [
        el('input', {
          type: 'checkbox', checked: !!state[key],
          onclick: (e) => { vibrate(12); onToggle(key, e.target.checked); },
        }),
        el('span', { class: 'track' }),
      ]),
    ]);
  }

  inner.append(
    el('div', { class: 'panel' }, [
      tog('sound', '🔊 সাউন্ড', 'বোতাম ও ইফেক্ট সাউন্ড'),
      tog('music', '🎵 মিউজিক', 'ব্যাকগ্রাউন্ড মিউজিক'),
      tog('vibrate', '📳 ভাইব্রেশন', 'মোবাইলে ভাইব্রেশন (সাপোর্টে)'),
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { text: '🛠️ প্রগ্রেস' }),
      el('p', { text: `আনলক করা level: ${state.unlocked} / ${LEVELS.length}` }),
      el('p', { class: 'small', text: 'সেভ localStorage-এ আছে, রিফ্রেশ করলেও থাকে।' }),
      el('button', { class: 'btn btn-danger', onclick: () => { if (onReset) onReset(); toast('প্রগ্রেস মুছেছে'); nav('home'); } }, [
        el('span', { class: 'ico', text: '🗑️' }), el('span', { class: 'lbl', text: 'পুরো প্রগ্রেস রিসেট' }),
      ]),
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { text: '⚖️ Legal / Disclaimer' }),
      el('p', { class: 'small', text: 'কাল্পনিক ও ব্যঙ্গাত্মক কনটেন্ট সংক্রান্ত গুরুত্বপূর্ণ নোটিশ।' }),
      el('button', { class: 'btn', onclick: () => { vibrate(12); nav('legal'); } }, [
        el('span', { class: 'ico', text: '📜' }),
        el('span', { class: 'lbl', text: 'গুরুত্বপূর্ণ নোটিশ দেখুন' }),
      ]),
    ]),
  );
  s.appendChild(inner);
  mount(s);
}

/* ============ ABOUT ============ */
export function aboutScreen(nav) {
  const s = el('div', { class: 'screen' });
  const inner = el('div', { class: 'screen-inner' });
  inner.append(backRow('যা আছে', () => nav('home')));
  const p1 = el('div', { class: 'panel' }, [
    el('h3', { text: '⚡ খাম্বার কাহিনী (v1.0)' }),
    el('p', { text: 'একটি কাল্পনিক ব্যঙ্গাত্মক ইন্ডি গেম। প্রতিটি চরিত্র, প্রতিষ্ঠান ও ঘটনা সম্পূর্ণ বানানো। কোনো প্রকৃত ব্যক্তি, দল বা সরকারি সিল নেই।' }),
    el('p', { text: 'গল্প: একটা অলস খাম্বা, একজন ধৈর্যশীল-নাগরিক, আর একজন “প্ল্যান-ওয়ালা” পাওয়ার বাবু… আর সবচেয়ে বড় চরিত্র: অপেক্ষা।' }),
    el('p', { class: 'small', text: 'কোনো ব্যাকএন্ড নেই • localStorage-এ সেভ • Vercel-ready' }),
  ]);
  const legalPanel = el('div', { class: 'panel' }, [
    el('h3', { text: '⚖️ Legal / Disclaimer' }),
    el('p', { class: 'small', text: 'এই গেমটি কাল্পনিক ও ব্যঙ্গাত্মক বিনোদন। গুরুত্বপূর্ণ নোটিশটি যেকোনো সময় আবার পড়তে পারেন।' }),
    el('button', { class: 'btn', onclick: () => { vibrate(12); nav('legal'); } }, [
      el('span', { class: 'ico', text: '📜' }),
      el('span', { class: 'lbl', text: 'গুরুত্বপূর্ণ নোটিশ দেখুন' }),
    ]),
  ]);
  inner.append(p1, legalPanel);
  s.appendChild(inner);
  mount(s);
}

/* ============ GAME OVERLAY ROOT ============ */
export function makeOverlayRoot() {
  const root = el('div', { id: 'overlay-root', style: 'position:absolute;inset:0;pointer-events:none;z-index:80' });
  return root;
}

/* ============ PAUSE ============ */
export function pauseOverlay(nav, onResume) {
  const ov = el('div', { class: 'pause-overlay', style: 'pointer-events:auto' }, [
    el('div', { class: 'pause-box' }, [
      el('div', { class: 'modal-title', text: '⏸️ বিরতি' }),
      el('p', { class: 'modal-sub', text: 'বলতে পারছি না কারেন্ট কবে আসবে… তবে আপনি রিফ্রেশ করলেই আবার বসবেন।' }),
      el('button', { class: 'btn btn-primary', onclick: () => { vibrate(14); ov.remove(); onResume && onResume(); } }, [
        el('span', { class: 'ico', text: '▶️' }), el('span', { class: 'lbl', text: 'চালিয়ে যান' }),
      ]),
      el('button', { class: 'btn', onclick: () => { vibrate(14); ov.remove(); nav('home'); } }, [
        el('span', { class: 'ico', text: '🏠' }), el('span', { class: 'lbl', text: 'মেনুতে ফিরুন' }),
      ]),
    ]),
  ]);
  return ov;
}

/* ============ RESULT ============ */
export function resultScreen({ title, subtitle, stats, score, rank, onReplay, onNext, nextEnabled, onLevelSelect, onMenu }) {
  const ov = el('div', { class: 'full-overlay', style: 'pointer-events:auto' });
  const box = el('div', { class: 'modal-box' });
  const card = el('div', { class: 'result-card pop-in' }, [
    el('div', { class: 'result-rank' }, [
      el('span', { class: 'result-rank-emoji', text: rankEmoji(rank) }),
      el('span', { class: 'result-rank-text', text: rankText(rank) || '🏅 ভোগান্তি বিজয়ী' }),
    ]),
    el('div', { class: 'result-score-wrap' }, [
      el('div', { class: 'result-score', text: String(score || 0) }),
      el('div', { class: 'result-label', text: 'আজকের ভোগান্তি স্কোর' }),
    ]),
    el('div', { class: 'modal-title', text: title || 'তথ্যসংগ্রহ সম্পন্ন!' }),
    el('div', { class: 'rows' }, rowsOf(stats)),
    subtitle ? el('p', { class: 'modal-sub', text: subtitle }) : null,
  ]);

  const actions = el('div', { class: 'menu' });
  if (onReplay) actions.append(makeBtn('আবার খেলুন', '🔄', () => { ov.remove(); onReplay(); }));
  if (nextEnabled && onNext) actions.append(makeBtn('পরের Level', '⏭️', () => { ov.remove(); onNext(); }, 'btn-go'));
  if (onLevelSelect) actions.append(makeBtn('Level নির্বাচন', '🗺️', () => { ov.remove(); onLevelSelect(); }));
  actions.append(makeBtn('Share রেজাল্ট', '🔗', () => shareResult(score, stats)));
  if (onMenu) actions.append(makeBtn('🏠 মেনুতে ফিরুন', '🏠', () => { ov.remove(); onMenu(); }));

  box.append(card, actions);
  ov.appendChild(box);
  return ov;
}

/* rank strings look like '🏆 মহান ভোগান্তি রাজা' — split for the badge UI */
function rankEmoji(rank) {
  const m = /^\s*(\p{Extended_Pictographic}\uFE0F?)/u.exec(rank || '');
  return m ? m[1] : '🏅';
}
function rankText(rank) {
  return (rank || '').replace(/^\s*\p{Extended_Pictographic}\uFE0F?\s*/u, '').trim();
}

function rowsOf(stats) {
  const defs = [
    ['⚡ বিদ্যুৎ ছাড়া', fmtTime(stats.outageTime)],
    ['📞 অভিযোগ', stats.complaints ?? 0],
    ['🔎 খাম্বা চেক', stats.polesChecked ?? 0],
    ['💰 অতিরিক্ত খরচ', '৳' + (stats.money ?? 0)],
    ['🔋 ব্যাটারি ব্যবহৃত', (stats.battery ?? 0) + '%'],
    ['😤 ভোগান্তি', (stats.frustration ?? 0) + '%'],
  ];
  return defs.map(([k, v]) => el('div', { class: 'row-stat' }, [
    el('span', { class: 'k', text: k }),
    el('span', { class: 'v', text: `${v}` }),
  ]));
}

function fmtTime(sec) {
  if (sec == null) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : `${Math.floor(sec)}s`;
}

function shareResult(score, stats) {
  const lines = [
    `⚡ আজকের ভোগান্তি স্কোর: ${score} ⚡😂`,
    'খাম্বার কাহিনী — খাম্বা আছে, কারেন্ট নাই!',
    `💡 বিদ্যুৎ ছাড়া ${fmtTime(stats.outageTime)} | 📞 অভিযোগ ${stats.complaints ?? 0}`,
    `🎯 Score: ${score}`,
  ];
  const textShare = lines.join('\n');
  const payload = textShare;
  const doShare = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'খাম্বার কাহিনী', text: payload }); return; }
      await navigator.clipboard.writeText(payload);
      toast('রেজাল্ট কপি হয়েছে ✔');
    } catch (_) { toast('শেয়ার করা হলো না 😅'); }
  };
  doShare();
}