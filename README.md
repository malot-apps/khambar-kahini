# ⚡ খাম্বার কাহিনী

খাম্বা আছে, তার আছে… কারেন্ট কোথায়?

একটি Bengali-first, mobile-friendly, ব্যাঙ্গাত্মক 2D ইন্ডি গেম। কোনো ব্যাকএন্ড, ডাটাবেস, লগইন বা পেইড API নেই। Pure HTML/CSS/JS, Vercel static hosting-এ চলবে।

## run / build
```
npm i -g serve   # or any static server
serve .
```
No build step required. Deploy simply by importing the repo on Vercel (framework: Other).

## structure
```
index.html
vercel.json
assets/
  style.css
  js/
    main.js      - bootstrap & routing
    engine.js    - canvas engine, player, render loop, HUD, dialogs
    levels.js    - all 5 levels
    data.js      - Bengali content (poles, dialogues, levels)
    ui.js        - screens (home, levels, settings…), result card
    audio.js     - audio manager (graceful fail)
    utils.js     - storage, toast, share, helpers
  audio/
    we_have_a_plan.mp3   <- OPTIONAL custom Power Babu voice
    sfx/                  <- optional sound effects
    music/                <- optional background music
```

## custom voice
Place your own file at:
```
assets/audio/we_have_a_plan.mp3
```
The game only plays it **if the file exists**; otherwise it continues silently. No error. The game never depends on it.

## controls
- Desktop: Arrows / WASD to move, Space / E to interact, P to pause
- Mobile: left virtual joystick + right "যোগাযোগ" button

## save
localStorage only (`khambar_save_v1`). Resetting progress via Settings.

## safety note
Fully fictional characters & institutions. The "Power Babu", poles and office are satire — no real person, party, or government seal. No dangerous electrical instructions are modeled.