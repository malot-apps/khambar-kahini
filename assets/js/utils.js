/* ============ utils.js — DOM helpers, storage, formatting ============ */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'onclick') node.addEventListener('click', v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v === false) {
      // boolean false: skip attribute entirely (e.g. checked:false must stay unchecked)
    } else if (v !== null && v !== undefined) {
      node.setAttribute(k, v);
    }
  }
  const list = Array.isArray(children) ? children : [children];
  for (const c of list) if (c) node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

export function shake(node) {
  if (!node) return;
  node.classList.add('shake');
  setTimeout(() => node.classList.remove('shake'), 450);
}

export function vibrate(ms = 30) {
  try {
    if (navigator.vibrate && getS('vibrate', true)) navigator.vibrate(ms);
  } catch (_) { /* ignore */ }
}

export function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

/* ---------- localStorage save system ---------- */
const KEY = 'khambar_save_v1';

const DEFAULTS = {
  unlocked: 1,           // highest unlocked level number
  bestScore: {},         // { level: number }
  completed: [],         // [levels]
  sound: true,
  music: true,
  vibrate: true,
  stats: { // cumulative for the final ending flavor
    complaints: 0,
    polesChecked: 0,
    totalScore: 0,
  },
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, completed: [], bestScore: {}, stats: { ...DEFAULTS.stats } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      bestScore: { ...(parsed.bestScore || {}) },
      stats: { ...DEFAULTS.stats, ...(parsed.stats || {}) },
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
    };
  } catch (_) {
    return { ...DEFAULTS, completed: [], bestScore: {}, stats: { ...DEFAULTS.stats } };
  }
}

export function persistSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (_) { /* ignore */ }
}

// Shortcuts reading/writing single values in save
export function getS(key, fallback = null) {
  return loadSave()[key] !== undefined ? loadSave()[key] : fallback;
}

export function setS(key, value) {
  const save = loadSave();
  save[key] = value;
  persistSave(save);
  return save;
}

export function updateSave(mutator) {
  const save = loadSave();
  const res = mutator(save);
  persistSave(save);
  return res;
}

export function resetSave() {
  const save = { ...DEFAULTS, completed: [], bestScore: {}, stats: { ...DEFAULTS.stats } };
  persistSave(save);
  return save;
}

/* ---------- toast ---------- */
let toastTimer = null;
export function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2300);
}

/* ---------- cursor / pointer coordinate helpers ---------- */
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ---------- simple RNG ---------- */
export function rand(a, b) { return a + Math.random() * (b - a); }
export function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ---------- share helpers ---------- */
export function canShare() {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

export async function shareResult(text, title = 'খাম্বার কাহিনী') {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return true;
    }
    await copyText(text);
    return true;
  } catch (_) { return false; }
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (_) { fallbackCopy(text); }
  toast('লিখা কপি করা হয়েছে ✔');
}

function fallbackCopy(text) {
  try {
    const ta = el('textarea', { style: 'position:fixed;left:-9999px;opacity:0' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch (_) { /* ignore */ }
}

/* ---------- legal / fiction disclaimer acknowledgement ---------- */
const LEGAL_ACK_KEY = 'khambar_legal_ack_v1';
const LEGAL_SESSION_KEY = 'khambar_legal_ack_session';

export function getLegalAck() {
  try { return JSON.parse(localStorage.getItem(LEGAL_ACK_KEY) || 'null'); }
  catch (_) { return null; }
}

/* Records acknowledgement: sessionStorage flag (so the notice is not repeated
   during the same normal session) + timestamped localStorage record. */
export function setLegalAck() {
  try { localStorage.setItem(LEGAL_ACK_KEY, JSON.stringify({ acknowledged: true, ts: Date.now() })); } catch (_) { /* ignore */ }
  try { sessionStorage.setItem(LEGAL_SESSION_KEY, '1'); } catch (_) { /* ignore */ }
}

export function hasSessionAck() {
  try { return sessionStorage.getItem(LEGAL_SESSION_KEY) === '1'; }
  catch (_) { return false; }
}