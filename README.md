# BulkBuddy

**Live app:** https://siuuu-helthapp-ffan.vercel.app
**Report:** [REPORT.md](REPORT.md) · **Name:** [Your Name] · **Roll No:** [Roll No] · MAI-594 Introduction to Vibe Coding

BulkBuddy is a dark-themed, mobile-first dashboard for a competitive field-football player on a strength and weight-gain protocol (66 → 75 kg). It opens from a link with no install and no sign-up. App state lives in React and the browser's localStorage, with no database. One small server route (`/api/log`) calls Google Gemini so the API key stays out of the browser and the repo. If the AI isn't available, the app switches to **demo mode** (rule-based) by itself.

> ⚕️ Not Medical Advice. Does not diagnose or prescribe. See a doctor for red-flag symptoms.

## Features
**Training**
- **Hypertrophy milestone tracker:** SVG weight chart from a 66 kg baseline to a 75 kg target, with milestones at 68/70/72/75 kg, kg/week and projected weeks to go.
- **Hydration ring:** calibrated to 4 L/day, with +250/500/750 ml buttons.
- **AI log:** voice note (🎙️, Chrome speech recognition), messy or Hinglish text, or a 📷 meal photo. Gemini turns it into food with estimated macros, water, cardio and weigh-ins, plus one coaching line for the rest of the day. The rule-based parser in `src/lib/parser.ts` is the demo-mode fallback.
- **AI test bench** at `/test`: runs 10 realistic inputs live or in demo mode and gives a Markdown table for the report.
- **Macro recovery nudge:** appears when protein is ≥20 g behind the time-of-day pace and suggests a whole-food high-protein meal, which can be logged with one tap.
- **Cardio energy warning:** appears when aerobic work is logged. It shows the kcal burned and raises the day's energy target by that amount.
- **Red-flag check:** chest pain, collapse, breathing trouble, blood, performance drugs or purging → stop and see a doctor (112).
- **Demo controls:** "pretend it's 18:00" so the nudge can be shown at any time of day.

**Fan Zone**
- A scrollable scoreboard for 7 competitions (Premier League, Champions League, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie), with live minutes ticking, goals, HT/FT and upcoming fixtures. **All scores are simulated.** It uses initials badges, not club logos.

## Run locally
```bash
npm install
npm run dev   # http://localhost:3000
```

## Deploy (free)
1. Push to a public GitHub repo → vercel.com → *Add New Project* → import → Deploy.
2. *Settings → Environment Variables*: `GEMINI_API_KEY` = your key from aistudio.google.com (optional `GEMINI_MODEL`, default `gemini-2.5-flash`). Redeploy.
3. Keep the key on the free tier or set a low budget cap. **Never commit the key** (`.env*` is git-ignored).

## Structure
```
src/app/page.tsx            tabs, state, log handling
src/components/Training.tsx all training cards + localStorage hook
src/components/FanZone.tsx  simulated scoreboard
src/app/api/log/route.ts    server route → Gemini (key from env), validates output
src/app/test/page.tsx       10-input AI test bench
src/lib/ai.ts               live AI call + safety layer + demo fallback
src/lib/parser.ts           demo-mode rule parser + red-flag rules + meal list
src/lib/fixtures.ts         simulated leagues, matches, live tick
```

## Credits
Built with Next.js and Tailwind CSS (MIT). AI by Google Gemini API. Code generated with help from Claude (Anthropic) and reviewed by me. There are no third-party images; the icons are system emoji. Macro values are rounded approximations.
