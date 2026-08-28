/* ============ main.js — App bootstrap & routing ============ */
import { $, hasSessionAck } from './utils.js';
import {
  loadSave, resetSave, updateSave,
} from './utils.js';
import { Audio } from './audio.js';
import { Engine } from './engine.js';
import { setStage, homeScreen, levelSelectScreen, howToScreen, aboutScreen, settingsScreen } from './ui.js';
import { disclaimerScreen } from './disclaimer.js';
import { level1, level2, level3, level4, level5 } from './levels.js';

const BUILDERS = { 1: level1, 2: level2, 3: level3, 4: level4, 5: level5 };

const stage = $('#stage');
setStage(stage);

const engine = new Engine();
engine.onLevelSelect = () => goLevels();

let activeLevel = null;

/* ---------- routing ---------- */
function nav(to) {
  Audio.click();
  if (to === 'home') goHome();
  else if (to === 'levelselect') goLevels();
  else if (to === 'howto') goHowTo();
  else if (to === 'about') goAbout();
  else if (to === 'settings') goSettings();
  else if (to === 'legal') goLegal();
  else if (to === 'play') startPlay();
}

function goHome() { engine.stop(); homeScreen(nav); }
function goLevels() { engine.stop(); levelSelectScreen(nav, loadSave, (id) => runLevel(id)); }
function goHowTo() { engine.stop(); howToScreen(nav); }
function goAbout() { engine.stop(); aboutScreen(nav); }
function goLegal() { engine.stop(); disclaimerScreen(nav); }
function goSettings() {
  engine.stop();
  settingsScreen(nav, loadSave(), (key, val) => {
    if (key === 'sound') Audio.setSound(val);
    else if (key === 'music') Audio.setMusic(val);
    updateSave((s) => { s[key] = val; return s; });
  }, () => { resetSave(); });
}

/* ---------- Play flow ---------- */
function startPlay() {
  const save = loadSave();
  // find the first uncompleted level
  let id = save.unlocked || 1;
  // if all done, default to 1
  runLevel(id);
}

function runLevel(id) {
  activeLevel = id;
  engine.stop();
  engine.mount(stage);
  const cb = levelCallbacks(id);
  const cfg = BUILDERS[id](engine, cb);
  engine.start(cfg);
  Audio.playMusic('bg');
}

function levelCallbacks(id) {
  return {
    exit: () => goHome(),
    replay: () => { Audio.click(); runLevel(id); },
    next: (nid) => {
      recordLevel(id, engine.lastResult || {});
      if (nid) runLevel(nid);
      else goLevels();
    },
  };
}

function recordLevel(id, result) {
  updateSave((s) => {
    const score = (result && result.score) || 0;
    if (score > (s.bestScore[id] || 0)) s.bestScore[id] = score;
    if (!s.completed.includes(id)) s.completed.push(id);
    const next = Math.min(5, id + 1);
    if (next > s.unlocked) s.unlocked = next;
    if (result) {
      s.stats = s.stats || { complaints: 0, polesChecked: 0, totalScore: 0 };
      s.stats.complaints += result.complaints || 0;
      s.stats.polesChecked += result.polesChecked || 0;
      s.stats.totalScore += score;
    }
    return s;
  });
}

/* ---------- boot ---------- */
function boot() {
  const onGesture = () => {
    if (!window.__audioInit) {
      window.__audioInit = true;
      Audio.init();
      window.removeEventListener('pointerdown', onGesture);
    }
  };
  window.addEventListener('pointerdown', onGesture, { passive: true });
  window.addEventListener('keydown', onGesture, { once: true });

  // loader progress
  const fill = $('#loader-fill');
  let p = 0;
  const t = setInterval(() => {
    p += 8;
    if (fill) fill.style.width = Math.min(100, p) + '%';
    if (p >= 100) {
      clearInterval(t);
      setTimeout(() => {
        $('#loader')?.classList.add('done');
        $('#app')?.classList.remove('hidden');
        enterApp();
      }, 200);
    }
  }, 70);
}

/* First screen of a session: the fiction/satire notice (once per session),
   then the Home Screen. Acknowledgement is stored (session + localStorage). */
function enterApp() {
  if (hasSessionAck()) goHome();
  else goLegal();
}

// start everything
boot();

export { nav, runLevel, engine };