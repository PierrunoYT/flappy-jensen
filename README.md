# Flappy Jensen

A one-button browser flyer: flap or fall, dodge the pipes. The physics follow the
original Flappy Bird (Android v1.3), scaled 1.5x.

**Play it:** https://pierrunoyt.github.io/flappy-jensen/

## Controls

| Key | Action |
|---|---|
| Space, Up, W, Enter, tap | Flap |
| P | Pause |
| F | Full screen |
| M | Sound on/off |

Score 10, 20, 30, or 40 pipes for a bronze, silver, gold, or platinum medal.
Your best score is saved in the browser.

## Run locally

No build step; it is plain HTML, CSS, and JavaScript.

```bash
python -m http.server 8080 --directory web
```

Then open http://localhost:8080.

## Project layout

- `web/game.js`: game rules (physics, pipes, collisions, scoring), no drawing
- `web/jensen.js`: rendering, input, sound, and UI
- `web/index.html`, `web/jensen.css`: page and styles
- `web/credits.html`: photo attribution and license information

## Deploying

Every push to `main` deploys `web/` to GitHub Pages via
`.github/workflows/pages.yml`.

Not affiliated with NVIDIA.
