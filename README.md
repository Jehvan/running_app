# Couch to Consistent

A beginner-friendly running coach app: it builds you a safe run/walk training
plan, times your intervals, logs how each run felt, and adapts the plan week
to week based on how things are actually going.

Not medical advice — informational only. Stop and see a professional if you
experience sharp or persistent pain.

## Why it's built this way

- **Installable on iOS without an App Store submission.** It's a PWA (React +
  Vite + `vite-plugin-pwa`). Open it in Safari on your iPhone and use
  **Share → Add to Home Screen** to get an app icon and full-screen experience
  — no Apple Developer account or Xcode needed.
- **Works offline, your data stays on your device.** All plan/run data lives
  in IndexedDB (via Dexie) in the browser. There's no account system and
  nothing is uploaded except the small, anonymous summary sent to adjust your
  plan (see below). Use **Export**/**Import** in the header to back up or move
  your data.
- **The plan generator is rule-based, not AI.** Progression follows a proven
  beginner run/walk structure (`web/src/lib/planGenerator.ts`), with hard caps
  so the plan can never advance faster than is safe — every 4th week is a
  built-in cutback, and pain/missed-session signals force a hold or step back.
- **Claude only writes the explanation, not the decision.** At the end of each
  week, the app decides advance/hold/step-back itself with the same rules
  above (checked again server-side), then asks Claude for a short, encouraging
  note explaining *why*. If there's no API key configured, or the request
  fails, the app just shows the rule-based reason directly — the AI layer is
  additive, never load-bearing.

## Project layout

```
web/     React + TypeScript + Vite PWA — the whole user-facing app
server/  Small Express API with one real endpoint, POST /api/adjust-plan,
         which calls the Anthropic API to generate the weekly coach note
```

## Running it locally

```bash
npm run install:all

# terminal 1
npm run dev:server   # http://localhost:8787

# terminal 2
npm run dev:web      # http://localhost:5173 (proxies /api to the server)
```

Copy `server/.env.example` to `server/.env` and set `ANTHROPIC_API_KEY` to
enable the AI coach notes. Without it, the app still works fully — it just
shows the plain rule-based explanation instead of a Claude-written one.

## Installing on your iPhone

1. Deploy `web/` (see below) or run it locally and open the URL on your phone.
2. Open the site in **Safari** (must be Safari, not Chrome, for this to work).
3. Tap **Share → Add to Home Screen**.
4. Launch it from the home screen icon — it runs full-screen like a native app.

## Deploying

- `web/` builds to static files (`npm run build:web`) — deploy for free to
  GitHub Pages, Netlify, Vercel, or Cloudflare Pages.
- `server/` is a plain Express app — deploy to any Node host (Fly.io, Render,
  Railway, a VPS...) and set `ANTHROPIC_API_KEY` there. Point the web app's
  `/api` requests at that host in production (see `web/vite.config.ts`'s dev
  proxy for the equivalent local setup).

## Roadmap

**Now (v1):** run/walk interval timer with voice + vibration cues, rule-based
beginner plan generator with automatic cutback weeks, post-run RPE/mood/pain
check-in, AI-explained weekly plan adjustment, progress view, JSON
export/import backup, installable iOS/Android PWA.

**Later:** GPS-tracked distance/pace/routes, Apple Health / Strava import,
push notifications for scheduled runs, calendar (.ics) export, race-day
predictor, cross-training days.
