// Client-side AI wrapper: tries the live Gemini route, falls back to the rule-based
// parser (demo mode) if there is no key / no network. Safety checks run here on EVERY
// result, so the app — not the model — has the last word.

import { parseLog, type Macros, type ParsedEvent, type ParseResult } from "./parser";

export type LogInput = {
  text: string;
  image?: { mime: string; data: string } | null;
  totals?: Macros & { waterMl?: number };
  recent?: string[];
  forceDemo?: boolean;
};

const BANNED = /\b(creatine|supplement|whey (isolate|brand)|steroid|sarm|tablet|pill|capsule|\d+\s*mg|dose|paracetamol|ibuprofen)\b/i;

export function summarize(events: ParsedEvent[]): string {
  const parts: string[] = [];
  for (const e of events) {
    if (e.kind === "food") parts.push(`${e.qty !== 1 ? e.qty + "× " : ""}${e.label} (+${e.macros.protein} g protein)`);
    if (e.kind === "water") parts.push(`${e.ml} ml water`);
    if (e.kind === "cardio") parts.push(`${e.minutes} min ${e.label.toLowerCase()} (≈${e.kcal} kcal burned)`);
    if (e.kind === "weight") parts.push(`weigh-in ${e.kg} kg`);
  }
  return parts.length ? `Logged: ${parts.join(" · ")}` : "";
}

export async function analyzeLog(input: LogInput): Promise<ParseResult> {
  const local = parseLog(input.text); // also our independent red-flag check
  const localFlags = local.events.filter((e) => e.kind === "redflag");

  if (!input.forceDemo) {
    try {
      const r = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.text,
          image: input.image || undefined,
          totals: input.totals,
          recent: input.recent,
          time: new Date().toLocaleString("en-IN"),
        }),
      });
      if (r.ok) {
        const d = await r.json();
        let events: ParsedEvent[] = d.events || [];
        // Merge in red flags the rules caught even if the model missed them.
        for (const f of localFlags) if (!events.some((e) => e.kind === "redflag")) events = [...events, f];
        let coach: string = d.coach || "";
        if (BANNED.test(coach)) coach = "Keep it simple: a proper whole-food meal with a protein source at your next meal, and water now.";
        const flagged = events.some((e) => e.kind === "redflag");
        const unknown = events.length === 0;
        return {
          events,
          mode: "live",
          unknown,
          coach: flagged ? "" : coach,
          askBack: d.ask_back || "",
          summary: summarize(events) || (unknown ? d.ask_back || "I couldn't find anything to log there." : "Safety check"),
        };
      }
    } catch {
      /* fall through to demo mode */
    }
  }
  return { ...local, mode: "demo" };
}

// Shrink a photo in the browser before upload (keeps requests small and cheap).
export function fileToJpeg(file: File, max = 1024): Promise<{ mime: string; data: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/jpeg", 0.8);
      resolve({ mime: "image/jpeg", data: url.split(",")[1], preview: url });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
