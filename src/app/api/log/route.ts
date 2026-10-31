// Server route: sends the athlete's messy log (text in any language/mix, and/or a meal photo)
// to Google Gemini and returns structured events + one coaching line.
// The key lives ONLY in the host's environment variable GEMINI_API_KEY (never in the repo).

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM = `You are the logging assistant inside BulkBuddy, an app for a competitive field-football player on a strength-training and weight-gain (bulking) protocol, 66 kg -> 75 kg. Daily example targets: protein 145 g, carbs 400 g, fat 85 g, 3100 kcal, water 4 L.

The athlete sends MESSY input: a typed or dictated note, often Hinglish or mixed ("subah 4 ande aur 2 roti, practice ke baad shake"), and/or a PHOTO of a meal/thali/canteen plate.

Do this:
1. Extract every food/drink with an ESTIMATED serving and macros (protein, carbs, fat in grams; kcal). For photos, name the visible items and estimate portions from the plate. Use Indian and sports foods knowledge. Round sensibly.
2. Extract water (ml), aerobic/cardio work (label, minutes, estimated kcal burned for a ~68 kg athlete; football practice/match counts as cardio), and weigh-ins (kg).
3. Write "coach": ONE short, specific next step for the rest of today given the totals so far and the time (e.g. what to eat at the next meal to close the protein gap). Whole foods only.
4. If the input is too vague to log anything, leave events empty and put ONE question in "ask_back".

NEVER: diagnose; name, recommend or dose any medicine, supplement, creatine, protein powder brand, steroid/SARM or pills; give advice for chest pain, fainting/collapse, breathing trouble, blood in urine/vomit/stool, very dark urine, or purging/starving. For those, add a "redflag" event and say to stop training and see a doctor (emergency 112). Never shame body or food.

Match the athlete's language (Hinglish in -> Hinglish out, Roman script). Keep "coach" under 30 words.

Reply with ONLY JSON:
{"events":[{"kind":"food","label":"","qty":1,"macros":{"protein":0,"carbs":0,"fat":0,"kcal":0}},{"kind":"water","ml":0},{"kind":"cardio","label":"","minutes":0,"kcal":0},{"kind":"weight","kg":0},{"kind":"redflag","reason":""}],"coach":"","ask_back":""}
Only include the events that actually occur.`;

const clamp = (n: unknown, lo: number, hi: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v * 10) / 10)) : lo;
};

// Validate whatever the model returns so bad numbers can't reach the UI.
function sanitize(raw: any) {
  const events: any[] = [];
  for (const e of Array.isArray(raw?.events) ? raw.events : []) {
    if (e?.kind === "food")
      events.push({
        kind: "food",
        label: String(e.label || "Food").slice(0, 60),
        qty: clamp(e.qty ?? 1, 0.1, 20),
        macros: {
          protein: Math.round(clamp(e.macros?.protein, 0, 200)),
          carbs: Math.round(clamp(e.macros?.carbs, 0, 400)),
          fat: Math.round(clamp(e.macros?.fat, 0, 200)),
          kcal: Math.round(clamp(e.macros?.kcal, 0, 3000)),
        },
      });
    else if (e?.kind === "water") events.push({ kind: "water", ml: Math.round(clamp(e.ml, 0, 3000)) });
    else if (e?.kind === "cardio")
      events.push({ kind: "cardio", label: String(e.label || "Cardio").slice(0, 40), minutes: Math.round(clamp(e.minutes, 1, 300)), kcal: Math.round(clamp(e.kcal, 0, 3000)) });
    else if (e?.kind === "weight" && Number(e.kg) > 35 && Number(e.kg) < 160) events.push({ kind: "weight", kg: clamp(e.kg, 35, 160) });
    else if (e?.kind === "redflag") events.push({ kind: "redflag", reason: String(e.reason || "Needs a doctor").slice(0, 80) });
  }
  return { events, coach: String(raw?.coach || "").slice(0, 300), ask_back: String(raw?.ask_back || "").slice(0, 200) };
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "no_key" }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }
  const text = String(body?.text || "").slice(0, 1500);
  const image = body?.image;
  if (!text && !image?.data) return Response.json({ error: "empty" }, { status: 400 });
  if (image?.data && String(image.data).length > 3_500_000) return Response.json({ error: "image_too_large" }, { status: 413 });

  const ctx = `Local time: ${body?.time || "unknown"}. Totals so far today: ${JSON.stringify(body?.totals || {})}. Recent logs: ${JSON.stringify(body?.recent || []).slice(0, 1500)}.
Athlete's new input: """${text || "(photo only)"}"""`;

  const parts: any[] = [{ text: ctx }];
  if (image?.data) parts.push({ inline_data: { mime_type: image.mime || "image/jpeg", data: image.data } });

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key.trim() },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 4096,
          // 2.5 models "think" by default and that eats the output budget → cut-off JSON.
          ...(MODEL.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) return Response.json({ error: "gemini_error", detail: data?.error?.message }, { status: 502 });
    const out: string = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
    let parsed: any;
    try {
      parsed = JSON.parse(out.replace(/^```json|```$/g, "").trim());
    } catch {
      const a = out.indexOf("{"), b = out.lastIndexOf("}");
      try { parsed = JSON.parse(out.slice(a, b + 1)); }
      catch { return Response.json({ error: "bad_json", detail: `finish=${data?.candidates?.[0]?.finishReason} ${out.slice(0, 160)}` }, { status: 502 }); }
    }
    return Response.json({ ...sanitize(parsed), model: MODEL });
  } catch (e) {
    return Response.json({ error: "server_error", detail: String(e).slice(0, 200) }, { status: 500 });
  }
}

// Health check: open /api/log in a browser to see whether the AI is configured and reachable.
// Never reveals the key itself.
export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ ok: false, problem: "GEMINI_API_KEY is not set in Vercel → Settings → Environment Variables (then Redeploy)." });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key.trim() },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with the word OK." }] }] }),
    });
    const d = await r.json();
    if (!r.ok) return Response.json({ ok: false, model: MODEL, status: r.status, problem: d?.error?.message || "Gemini error" });
    return Response.json({ ok: true, model: MODEL, reply: d?.candidates?.[0]?.content?.parts?.[0]?.text ?? "" });
  } catch (e) {
    return Response.json({ ok: false, model: MODEL, problem: String(e).slice(0, 200) });
  }
}
