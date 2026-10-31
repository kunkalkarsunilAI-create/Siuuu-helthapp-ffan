# BulkBuddy — Project Report

**Name:** [Your Name] · **Roll No:** [Roll No] · MAI-594 Introduction to Vibe Coding · PGDM (AI²) · Due 31 Oct 2026, 11:59 pm IST
**Live app:** https://siuuu-helthapp-ffan.vercel.app · **AI test bench:** https://siuuu-helthapp-ffan.vercel.app/test

> **Before submitting, delete this box.** ✍️ = needs YOUR real evidence (reviews, interviews, user test, class notes). Don't invent it; the declaration you sign says it's real. 📝 = drafted from how the app is built; rewrite in your own words and change anything you disagree with. Limit: 2,500 words, not counting tables, screenshots and references.

---

## Q1. Why do health apps fail? (8) ✍️

**Method.** I read [≥30] 1–2★ Play Store reviews of [e.g. a calorie counter, a gym/workout logger, a water reminder app], interviewed [≥3] people (ideally athletes) who stopped using a health app, and read [≥2] published sources.

*Sources to look up, verify and cite yourself:* research on mHealth / fitness-app abandonment and 30-day retention; Krebs & Duncan (2015), "Health App Use Among US Mobile Phone Owners", *JMIR mHealth uHealth*; studies on why calorie-tracking apps are abandoned (logging burden).

**Review coding** (count how many of your 30 reviews fit each theme):
| Theme | Count / 30 | Paraphrased example | App |
|---|---|---|---|
| Logging every meal is tedious / food search is slow | | | |
| Food database doesn't know Indian food or portions | | | |
| Built for weight LOSS; nothing for gaining / athletes | | | |
| Paywalls, ads | | | |
| Generic, nagging notifications | | | |

**Interviews**
| Person (pseudonym, role) | App used | Why they stopped (their words, paraphrased) |
|---|---|---|
| | | |
| | | |
| | | |

**Three reasons, ranked, with evidence**
1. …
2. …
3. …

---

## Q2. Who exactly is my customer? (8) ✍️📝

📝 *Draft persona; replace with details from your interviews:* **Arjun, 20, a central midfielder in his college's first XI and a district-level player.** His coach wants him at 75 kg (from 66 kg) before the season, to stop getting pushed off the ball. He trains 5 evenings a week plus gym 3×, eats in the hostel mess or at home, and doesn't cook. He tried a calorie-counting app. It assumed he wanted to *lose* weight, didn't know "dal-chawal" or "4 ande", and typing every meal after a 9 pm practice took too long. He stopped after about 10 days. **What he's trying to get done:** eat enough, especially protein, and drink enough on training days without spending time logging, and see that the scale is actually moving.

**Alternatives considered**
| Customer | Why rejected |
|---|---|
| General gym-goer "bulking" | Well served by existing macro apps. Less urgent, no deadline. |
| Endurance runner trying to *lose* weight | Opposite goal; most existing apps already target weight loss. |
| ✍️ [one more from your research] | |

**Why this follows from Q1:** ✍️ [link your ranked reasons, e.g. logging burden → voice/photo logging; "apps are built for weight loss" → a gain-first dashboard and the cardio-energy warning.]

---

## Q3. What does AI do that ordinary software could not? (10) 📝✍️

1. **Takes messy input and acts on it.** One sentence such as *"subah 4 ande aur 2 roti, practice ke baad banana shake"*, a voice note, or a **photo of a plate** becomes itemised foods with estimated macros, water, training load and weigh-ins. A form would need a food search and portion entry for every item, and a fixed database fails on Hinglish and mixed dishes. The demo-mode results show this: the rule-based version failed on "chicken biryani and a lassi", "football practice" and "only had chai and 2 biscuits".
2. **Decides the next step from today's context.** It uses the totals so far, the time and recent logs to write one specific instruction (e.g. what to eat at dinner to close the protein gap).
3. **Reaches out instead of waiting.** The protein nudge appears by itself when the athlete is behind pace for the time of day. The cardio card appears when aerobic work is logged and raises the energy target by the amount burned.

| | |
|---|---|
| **AI decides** | What was eaten/done and how much; macro estimates; whether something is a red flag; the one next step; whether to ask a question back |
| **AI does on its own** | Updates the macro bars, water ring, weight chart and energy target; writes the coaching line; replies in the athlete's language |
| **AI must never** | Diagnose; name or dose medicines, supplements, creatine, caffeine, steroids/SARMs; give advice on chest pain, collapse, breathing trouble, blood in urine/vomit, purging/starving; shame food or body |
| **Safety layers** | (1) System prompt rules. (2) The server validates and clamps every number the model returns. (3) Independent rule-based red-flag check in the browser that adds a red flag even if the model misses it. (4) A filter that replaces any coaching line mentioning supplements, pills or mg. (5) A permanent "Not Medical Advice" footer. |

**Test results, 10 realistic inputs (live AI).** ✍️ Open `/test` on the live app → *Run live AI* → *Copy as Markdown* → paste here. Read every row and correct verdicts. Report the failures honestly.

✍️ *[paste live table]*

**Baseline: demo mode (rules only), run 31 Oct 2026: 6/10.** It passed protein oats, the Hinglish eggs/roti note, the supplement question, both red flags and the vague "ate". It failed on #3 (logged only the chicken, missed the lassi and the biryani rice), #4 (didn't count "football practice" as training), #5 ("68.7" without "kg" wasn't read as a weigh-in) and #10 ("chai and 2 biscuits" not recognised). These are the messy inputs the AI is there for.

---

## Q4. What I'll build and leave out (10) ✍️📝

**Feature decisions.** ✍️ Fill all 18 rows from the Class Discussion Notes:
| ID | Class feature | Decision (Build now / Later / Never) | One-line reason |
|---|---|---|---|
| F01 | | | |
| … | | | |
| F18 | | | |
| NEW | Voice / Hinglish / photo logging | Build now | Q1: logging burden |
| NEW | Weight-gain milestone chart (66→75 kg) | Build now | Customer's goal is gain, not loss |
| NEW | 4 L hydration ring | Build now | High training volume |
| NEW | Proactive protein nudge | Build now | AI reaches out at the right moment |
| NEW | Cardio energy warning | Build now | Practice burns the surplus he needs |
| NEW | Fan Zone (simulated scores) | Build now / Later — ✍️ decide | See hard call 3 |

**Core experience** 📝
- *First two minutes:* open the link (no sign-up) → see the weight chart with milestones, an empty water ring and macro bars → tap the 🎙️ and say what you had for breakfast, or photograph the plate → the bars fill and a one-line next step appears.
- *Normal day:* 3–5 voice notes or photos, + water taps after training. If protein is behind by evening, a nudge offers a specific meal to log in one tap. A weekly weigh-in moves the chart.

*Screenshots:* ✍️ add Training (top), AI log with a result, the nudge, the red-flag card, and Fan Zone.

**Three hardest calls** (📝 drafts — replace with your reasoning)
1. *Estimates instead of exact calorie counting.* Weighed accuracy against effort. Chose AI estimates from a voice note or photo, because exact logging is what made people quit (Q1). Would change my mind if: the user test shows estimates are badly off for common meals.
2. *Warning about cardio, not banning it.* A footballer needs conditioning, so the card asks him to eat back what he burned and raises the energy target, rather than telling him to stop. Would change my mind if: a coach or sports dietitian advises otherwise.
3. *Including a Fan Zone in a health app.* ✍️ **Decide and argue this one.** For: a reason to open the app every day (retention, Q1). Against: the brief rewards focus, and it's not health. If your Q1 evidence shows people quit because the app was boring or there was no reason to open it, keep it and say so. Otherwise move it to "Later". Would change my mind if: [evidence].

---

## Q5. Build and user test (14) ✍️

**Built with:** Next.js + Tailwind CSS on Vercel; Google Gemini (`gemini-2.5-flash`) through a server route with the key in Vercel env vars; rule-based demo mode as fallback. Built with Claude as the coding assistant (see disclosure).

**User test.** With [pseudonym, footballer/athlete] on [date], on their phone.
- What they did: …
- What confused them: …
- What I changed (commit link): …

---

## References ✍️
[Every review source, article and paper you used.]

## AI-use disclosure 📝✍️
I used Claude (Anthropic) to generate the app code (Next.js components, the Gemini route, the safety layer, demo-mode parser and test bench), the README and this report's skeleton. I checked it by: [e.g. reading each file; running the 10-case test bench in demo and live mode; testing voice and photo logging on my phone; checking red-flag inputs; fixing X]. All research, interviews, the user test and the final decisions in Q1–Q4 are my own.

## Student declaration ✍️
[Paste the exact declaration from the starter template, sign and date.]
