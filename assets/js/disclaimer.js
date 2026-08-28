/* ============ disclaimer.js — Fiction / Satire Transparency Notice ============ */
/* Shown once per session before the main menu, reopenable from About/Settings.
   This is a transparency notice for a fictional satirical game —
   it is NOT a claim of legal immunity of any kind. */

import { el, setLegalAck } from './utils.js';
import { mount } from './ui.js';

export const DISCLAIMER_TITLE = '⚠️ গুরুত্বপূর্ণ নোটিশ';

export const DISCLAIMER_PARAS = [
  'এই গেমটি একটি কাল্পনিক ও ব্যঙ্গাত্মক বিনোদনমূলক কাজ। গেমের সকল চরিত্র, প্রতিষ্ঠান, ঘটনা, সংলাপ ও পরিস্থিতি কাল্পনিক এবং শুধুমাত্র গেমপ্লে, হাস্যরস ও সামাজিক সচেতনতার উদ্দেশ্যে তৈরি।',
  'কোনো বাস্তব ব্যক্তি, রাজনৈতিক দল, সরকার, সরকারি প্রতিষ্ঠান, দেশ, জাতি বা কোনো নির্দিষ্ট সম্প্রদায়কে উদ্দেশ্য করে অপমান, মানহানি, অভিযোগ বা রাজনৈতিক প্রচারণা করা এই গেমের উদ্দেশ্য নয়।',
  'গেমের কোনো চরিত্র, নাম, সংলাপ বা ঘটনা বাস্তব কোনো ব্যক্তি বা ঘটনার সঙ্গে মিলে গেলে তা সম্পূর্ণ অনিচ্ছাকৃত ও কাকতালীয়।',
  'গেমের ব্যঙ্গ ও মতামতকে কোনো বাস্তব ব্যক্তি বা প্রতিষ্ঠানের বিরুদ্ধে সত্য ঘটনা, অভিযোগ বা তথ্য হিসেবে গ্রহণ করা উচিত নয়।',
];

export const DISCLAIMER_TAGLINE = 'শুধু বিনোদন ও কাল্পনিক ব্যঙ্গের উদ্দেশ্যে।';

/* Builds + mounts the notice screen.
   Continue → Home Screen.  About the Game → About screen. */
export function disclaimerScreen(nav, { onContinue, onAbout } = {}) {
  const scroll = el('div', {
    class: 'notice-scroll',
    role: 'note',
    'aria-label': 'কাল্পনিক ও ব্যঙ্গাত্মক কনটেন্ট সংক্রান্ত নোটিশ',
  }, DISCLAIMER_PARAS.map((p) => el('p', { class: 'notice-p', text: p })));

  const card = el('div', { class: 'notice-card pop-in' }, [
    el('div', { class: 'notice-badge', 'aria-hidden': 'true', text: '⚠️' }),
    el('h1', { class: 'notice-title', text: DISCLAIMER_TITLE }),
    el('p', { class: 'notice-sub', text: 'ফিকশন ও ব্যঙ্গ সংক্রান্ত ঘোষণা' }),
    scroll,
    el('div', { class: 'notice-tag', text: '📌 ' + DISCLAIMER_TAGLINE }),
  ]);

  const actions = el('div', { class: 'notice-actions' }, [
    el('button', {
      class: 'btn btn-primary',
      onclick: () => { setLegalAck(); if (typeof onContinue === 'function') onContinue(); else nav('home'); },
    }, [
      el('span', { class: 'ico', text: '✓' }),
      el('span', { class: 'lbl', text: 'আমি বুঝেছি — Continue' }),
    ]),
    el('button', {
      class: 'btn',
      onclick: () => { setLegalAck(); if (typeof onAbout === 'function') onAbout(); else nav('about'); },
    }, [
      el('span', { class: 'ico', text: 'ℹ️' }),
      el('span', { class: 'lbl', text: 'About the Game' }),
    ]),
  ]);

  const s = el('div', { class: 'screen screen-disclaimer' }, [
    el('div', { class: 'screen-inner disclaimer-inner' }, [card, actions]),
  ]);
  mount(s);
  return s;
}