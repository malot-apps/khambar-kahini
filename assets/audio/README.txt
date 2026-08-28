খাম্বার কাহিনী — Audio assets folder

The game NEVER depends on these files. Missing files = silent skip, no errors.

OPTIONAL custom Power Babu voice slot:
  assets/audio/we_have_a_plan.mp3
Place a file with this exact name/path and the game will play it
during Level 3 ("অভিযোগ অফিস") right after the pause.

Optional SFX (any valid mp3 you drop in, matching names used by audio.js):
  assets/audio/sfx/click.mp3
  assets/audio/sfx/power_on.mp3
  assets/audio/sfx/power_off.mp3
  assets/audio/sfx/dialogue.mp3
  assets/audio/sfx/win.mp3
  assets/audio/sfx/lose.mp3

Optional background music:
  assets/audio/music/bg.mp3

If a file is missing, a tiny synthesized fallback may play (when audio is on),
or nothing at all. All audio fails gracefully.