/* ============ characters.js — Reusable Character Registry, Loader & Lightweight Animation ============ */
/* Adding a new character = drop a transparent PNG/WebP in assets/characters/ + add ONE config entry here. */

import { el } from './utils.js';

export const CHARACTER_DEFS = {
  player: {
    id: 'player',
    name: 'নাগরিক',
    role: 'ধৈর্যশীল খাম্বা-সন্ধানী',
    avatar: '🧑',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.85,
    src: 'assets/characters/player.png',
    fallbackColor: '#3f7cd9',
    label: 'নাগরিক',
    drawFallback: (ctx, x, y, state) => drawPlayerFallback(ctx, x, y, state),
  },
  power_babu: {
    id: 'power_babu',
    name: 'পাওয়ার বাবু',
    role: 'অভিযোগ ও পরিকল্পনা বিভাগ (সম্পূর্ণ কাল্পনিক চরিত্র)',
    avatar: '👴',
    width: 56,
    height: 72,
    anchorX: 0.5,
    anchorY: 0.88,
    src: 'assets/characters/power_babu.png',
    fallbackColor: '#d99b36',
    label: 'পাওয়ার বাবু',
    drawFallback: (ctx, x, y, state) => drawBabuFallback(ctx, x, y, state),
  },
  pole: {
    id: 'pole',
    name: 'খাম্বা',
    role: 'অলস বৈদ্যুতিক স্তম্ভ',
    avatar: '⚡',
    width: 40,
    height: 120,
    anchorX: 0.5,
    anchorY: 0.9,
    src: 'assets/characters/pole.png',
    fallbackColor: '#55689e',
    label: 'খাম্বা',
    drawFallback: (ctx, x, y, state) => drawPoleFallback(ctx, x, y, state),
  },
  assistant: {
    id: 'assistant',
    name: 'সহকারী ফাইলার',
    role: 'ফাইল স্থানান্তর বিশেষজ্ঞ',
    avatar: '👓',
    width: 44,
    height: 60,
    anchorX: 0.5,
    anchorY: 0.85,
    src: 'assets/characters/assistant.png',
    fallbackColor: '#6a7895',
    drawFallback: (ctx, x, y, state) => drawNpcFallback(ctx, x, y, state, '#6a7895', '👓'),
  },
  lineman: {
    id: 'lineman',
    name: 'লাইনম্যান ভাই',
    role: 'মই ও তার বিশেষজ্ঞ',
    avatar: '👷',
    width: 46,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.85,
    src: 'assets/characters/lineman.png',
    fallbackColor: '#e0882e',
    drawFallback: (ctx, x, y, state) => drawNpcFallback(ctx, x, y, state, '#e0882e', '👷'),
  },
  shopkeeper: {
    id: 'shopkeeper',
    name: 'দোকানদার ভাই',
    role: 'মোমবাতি ও ব্যাটারি বিক্রেতা',
    avatar: '🏪',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.85,
    src: 'assets/characters/shopkeeper.png',
    fallbackColor: '#3ea876',
    drawFallback: (ctx, x, y, state) => drawNpcFallback(ctx, x, y, state, '#3ea876', '🏪'),
  },
  rickshaw: {
    id: 'rickshaw',
    name: 'রিকশাওয়ালা মামা',
    role: 'লোডশেডিং পর্যবেক্ষক',
    avatar: '🛺',
    width: 52,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.85,
    src: 'assets/characters/rickshaw.png',
    fallbackColor: '#2b9ec9',
    drawFallback: (ctx, x, y, state) => drawNpcFallback(ctx, x, y, state, '#2b9ec9', '🛺'),
  },
  tea_seller: {
    id: 'tea_seller',
    name: 'চা-ওয়ালা মামা',
    role: 'চা ও খাম্বা গুজব কেন্দ্র',
    avatar: '☕',
    width: 44,
    height: 60,
    anchorX: 0.5,
    anchorY: 0.85,
    src: 'assets/characters/tea_seller.png',
    fallbackColor: '#c4623a',
    drawFallback: (ctx, x, y, state) => drawNpcFallback(ctx, x, y, state, '#c4623a', '☕'),
  },
  secret_npc: {
    id: 'secret_npc',
    name: 'রহস্যময় উপদেষ্টা',
    role: 'কারেন্ট দর্শনের পথপ্রদর্শক',
    avatar: '🕵️',
    width: 46,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.85,
    src: 'assets/characters/secret_npc.png',
    fallbackColor: '#7d52a8',
    drawFallback: (ctx, x, y, state) => drawNpcFallback(ctx, x, y, state, '#7d52a8', '🕵️'),
  },
};

/* ===================== Procedural Vector Character Fallbacks ===================== */
/* Used ONLY when a character's image file is missing. Pure canvas, never throws. */

function paintShadow(ctx, cx, cy, rx = 15, ry = 5) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paintLabel(ctx, cx, cy, label) {
  if (!label) return;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 11px "Hind Siliguri", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy);
}
export function drawPlayerFallback(ctx, cx, cy, { moving, walkT, talking, label } = {}) {
  paintShadow(ctx, cx, cy + 26);

  const bob = moving ? Math.sin(walkT) * 2 : Math.sin(performance.now() / 420) * 1.2;
  const sway = moving ? Math.sin(walkT * 2) * 4 : 0;

  // legs
  ctx.strokeStyle = '#2b3150';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy + 14 + bob * 0.4);
  ctx.lineTo(cx - 7 + sway, cy + 26);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 6, cy + 14 + bob * 0.4);
  ctx.lineTo(cx + 7 - sway, cy + 26);
  ctx.stroke();

  // body
  ctx.fillStyle = '#3f7cd9';
  ctx.beginPath();
  ctx.roundRect(cx - 13, cy - 12 + bob, 26, 30, 8);
  ctx.fill();
  ctx.fillStyle = '#2f5ea9';
  ctx.beginPath();
  ctx.roundRect(cx - 13, cy - 4 + bob, 26, 5, 2);
  ctx.fill();

  // arms
  const armS = moving ? Math.sin(walkT * 2) * 4 : Math.sin(performance.now() / 380) * 1.2;
  ctx.strokeStyle = '#3f7cd9';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - 11, cy - 6 + bob);
  ctx.lineTo(cx - 13 - 4 + armS, cy + 8 + bob);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 11, cy - 6 + bob);
  ctx.lineTo(cx + 13 + 4 - armS, cy + 8 + bob);
  ctx.stroke();

  // head + hair
  ctx.fillStyle = '#f1c9a0';
  ctx.beginPath();
  ctx.arc(cx, cy - 24 + bob, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2b3a';
  ctx.beginPath();
  ctx.arc(cx, cy - 28 + bob, 12, Math.PI, 0);
  ctx.fill();

  // eyes
  ctx.fillStyle = '#1c2233';
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 25 + bob, 1.7, 0, Math.PI * 2);
  ctx.arc(cx + 4, cy - 25 + bob, 1.7, 0, Math.PI * 2);
  ctx.fill();

  // mouth (talks while a dialog is open)
  if (talking) {
    ctx.fillStyle = '#992222';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 19 + bob, 3, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  paintLabel(ctx, cx, cy + 42, label);
}

export function drawPoleFallback(ctx, cx, cy) {
  paintShadow(ctx, cx, cy + 6, 12, 4);
  ctx.fillStyle = '#55689e';
  ctx.fillRect(cx - 4, cy - 110, 8, 116);
  ctx.fillRect(cx - 18, cy - 104, 36, 5);
  ctx.fillRect(cx - 18, cy - 92, 36, 4);
  ctx.fillStyle = '#7f8eb8';
  ctx.beginPath();
  ctx.arc(cx, cy - 112, 6, 0, Math.PI * 2);
  ctx.fill();
}
export function drawBabuFallback(ctx, cx, cy, { talking, label } = {}) {
  paintShadow(ctx, cx, cy + 30, 18, 6);

  const bob = Math.sin(performance.now() / 500) * 1.2;

  // legs
  ctx.strokeStyle = '#33302a';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy + 16);
  ctx.lineTo(cx - 8, cy + 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 7, cy + 16);
  ctx.lineTo(cx + 8, cy + 30);
  ctx.stroke();

  // punjabi body (long kurta, bureaucratic paunch)
  ctx.fillStyle = '#f3ead3';
  ctx.beginPath();
  ctx.roundRect(cx - 16, cy - 14 + bob, 32, 34, 9);
  ctx.fill();
  ctx.fillStyle = '#e2d5b4';
  ctx.beginPath();
  ctx.roundRect(cx - 16, cy + 12 + bob, 32, 8, 4);
  ctx.fill();

  // file folder in hand
  ctx.fillStyle = '#c9a24b';
  ctx.beginPath();
  ctx.roundRect(cx + 12, cy + 2 + bob, 14, 10, 2);
  ctx.fill();
  ctx.fillStyle = '#a3813a';
  ctx.fillRect(cx + 12, cy + 6 + bob, 14, 1.6);

  // head
  ctx.fillStyle = '#f0c89e';
  ctx.beginPath();
  ctx.arc(cx, cy - 26 + bob, 13, 0, Math.PI * 2);
  ctx.fill();
  // bald top + grey side hair
  ctx.fillStyle = '#d8d3c6';
  ctx.beginPath();
  ctx.arc(cx, cy - 26 + bob, 13, Math.PI * 0.92, Math.PI * 2.08);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - 12, cy - 24 + bob, 3.5, 0, Math.PI * 2);
  ctx.arc(cx + 12, cy - 24 + bob, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // glasses
  ctx.strokeStyle = '#55503f';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 27 + bob, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 5, cy - 27 + bob, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 1, cy - 27 + bob);
  ctx.lineTo(cx + 1, cy - 27 + bob);
  ctx.stroke();

  // eyes
  ctx.fillStyle = '#1c2233';
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 27 + bob, 1.6, 0, Math.PI * 2);
  ctx.arc(cx + 5, cy - 27 + bob, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // mustache
  ctx.fillStyle = '#55503f';
  ctx.beginPath();
  ctx.roundRect(cx - 7, cy - 21 + bob, 14, 3, 2);
  ctx.fill();

  // mouth
  if (talking) {
    ctx.fillStyle = '#992222';
    ctx.beginPath();
    ctx.ellipse(cx + 1, cy - 17 + bob, 3.2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  paintLabel(ctx, cx, cy + 46, label);
}

export function drawNpcFallback(ctx, cx, cy, { moving, walkT, talking } = {}, color, emoji) {
  paintShadow(ctx, cx, cy + 22, 14, 5);

  const bob = moving ? 0 : Math.sin(performance.now() / 460) * 1.2;
  const sway = moving ? Math.sin(walkT * 2) * 5 : 0;

  // legs
  ctx.strokeStyle = '#222b40';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + 12);
  ctx.lineTo(cx - 6 + sway, cy + 22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 5, cy + 12);
  ctx.lineTo(cx + 6 - sway, cy + 22);
  ctx.stroke();

  // body
  ctx.fillStyle = color || '#55689e';
  ctx.beginPath();
  ctx.roundRect(cx - 12, cy - 12 + bob, 24, 26, 6);
  ctx.fill();

  // head
  ctx.fillStyle = '#f0c89e';
  ctx.beginPath();
  ctx.arc(cx, cy - 24 + bob, 11, 0, Math.PI * 2);
  ctx.fill();

  // emoji badge
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji || '🧑', cx, cy - 36 + bob);
  ctx.textBaseline = 'alphabetic';

  // eyes & mouth
  ctx.fillStyle = '#1c2233';
  ctx.beginPath();
  ctx.arc(cx + 3, cy - 25 + bob, 1.5, 0, Math.PI * 2);
  ctx.arc(cx + 7, cy - 25 + bob, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#aa4433';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (talking) {
    ctx.arc(cx + 5, cy - 20 + bob, 2, 0, Math.PI);
  } else {
    ctx.moveTo(cx + 3, cy - 20 + bob);
    ctx.lineTo(cx + 7, cy - 20 + bob);
  }
  ctx.stroke();
}
/* ===================== Character System (registry + loader + animation) ===================== */

class CharacterSystem {
  constructor() {
    this.images = new Map();   // id -> HTMLImageElement (only when loaded)
    this.status = new Map();   // id -> 'loading' | 'loaded' | 'failed'
    this.init();
  }

  init() {
    if (typeof window === 'undefined' || typeof Image === 'undefined') return;
    for (const [id, def] of Object.entries(CHARACTER_DEFS)) {
      if (def.src) this.preload(id, def.src);
    }
  }

  /* Silent preload — a missing file just marks the character 'failed'
     and the procedural fallback takes over. Never throws. */
  preload(id, src) {
    if (this.status.has(id)) return;
    this.status.set(id, 'loading');
    try {
      const img = new Image();
      img.onload = () => {
        this.images.set(id, img);
        this.status.set(id, 'loaded');
      };
      img.onerror = () => {
        this.status.set(id, 'failed');
      };
      img.src = src;
    } catch (_) {
      this.status.set(id, 'failed');
    }
  }

  /* Register a new character at runtime — future-proof API. */
  register(id, def) {
    CHARACTER_DEFS[id] = { id, anchorX: 0.5, anchorY: 0.85, avatar: '🧑', ...def };
    if (def.src) this.preload(id, def.src);
  }

  getDef(id) {
    return CHARACTER_DEFS[id] || CHARACTER_DEFS.player;
  }

  isLoaded(id) {
    return this.status.get(id) === 'loaded' && this.images.has(id);
  }

  list() {
    return Object.keys(CHARACTER_DEFS);
  }

  /* Draw a character sprite with lightweight built-in animation:
     - idle : gentle bob
     - walk : bounce + limb-driven fallback
     - talk : subtle scale wobble (active while a dialog is open)
     - interaction cues are handled by the engine (facing / hint rings). */
  draw(id, ctx, x, y, state = {}) {
    if (!ctx) return;
    const def = this.getDef(id);
    const img = this.images.get(id);
    const isLoaded = this.isLoaded(id);

    const facing = state.facing != null ? state.facing : 1;
    const moving = !!state.moving;
    const walkT = state.walkT || 0;
    const talking = !!state.talking;
    const t = state.idleT != null ? state.idleT : performance.now() / 1000;

    ctx.save();
    ctx.translate(x, y);

    const idleBob = moving ? 0 : Math.sin(t * 2.5) * 1.5;
    const talkScale = talking ? 1 + Math.sin(t * 12) * 0.03 : 1;

    ctx.scale(facing < 0 ? -1 : 1, 1);
    ctx.scale(talkScale, talkScale);

    if (isLoaded) {
      const w = def.width;
      const h = def.height;
      const ox = -w * (def.anchorX != null ? def.anchorX : 0.5);
      const oy = -h * (def.anchorY != null ? def.anchorY : 0.85) + idleBob;

      paintShadow(ctx, 0, 4, w * 0.35, 5);
      const walkBob = moving ? Math.abs(Math.sin(walkT)) * 4 : 0;
      try {
        ctx.drawImage(img, ox, oy - walkBob, w, h);
      } catch (_) {
        if (def.drawFallback) def.drawFallback(ctx, 0, idleBob, { moving, walkT, talking, facing, idleT: t });
        else drawNpcFallback(ctx, 0, idleBob, { moving, walkT, talking, facing }, def.fallbackColor, def.avatar);
      }
    } else if (def.drawFallback) {
      def.drawFallback(ctx, 0, idleBob, { moving, walkT, talking, facing, idleT: t, label: def.label });
    } else {
      drawNpcFallback(ctx, 0, idleBob, { moving, walkT, talking, facing }, def.fallbackColor, def.avatar);
    }

    ctx.restore();
  }

  /* DOM avatar for dialogs: character image when available, emoji otherwise. */
  avatarNode(id, fallbackEmoji, cls = '') {
    const def = this.getDef(id);
    const wrap = el('div', { class: 'avatar ' + cls });
    if (this.isLoaded(id) && def.src) {
      wrap.appendChild(el('img', { class: 'avatar-img', src: def.src, alt: def.name || id, draggable: 'false' }));
    } else {
      wrap.textContent = fallbackEmoji || def.avatar || '🧑';
    }
    return wrap;
  }
}

export const Characters = new CharacterSystem();




