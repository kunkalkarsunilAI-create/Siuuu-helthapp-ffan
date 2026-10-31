// Mock "AI" parser: turns a free-text / voice-note style log into structured events.
// It's deliberately rule-based so the prototype needs no backend. Swap `parseLog`
// for a real LLM call later and keep the same return shape.

export type Macros = { protein: number; carbs: number; fat: number; kcal: number };

export type ParsedEvent =
  | { kind: "food"; label: string; qty: number; macros: Macros }
  | { kind: "water"; ml: number }
  | { kind: "cardio"; label: string; minutes: number; kcal: number }
  | { kind: "weight"; kg: number }
  | { kind: "redflag"; reason: string };

export type ParseResult = {
  events: ParsedEvent[];
  summary: string;
  unknown: boolean;
  mode?: "live" | "demo";
  coach?: string; // AI's short reply / next step
  askBack?: string; // AI's clarifying question
};

type Food = { keys: RegExp; label: string; macros: Macros };

// Approximate macros per typical serving (made-up/rounded reference values).
const FOODS: Food[] = [
  { keys: /protein oats|oats with (milk|whey)|overnight oats/, label: "Protein oats (bowl)", macros: { protein: 30, carbs: 60, fat: 10, kcal: 450 } },
  { keys: /\boats?\b|oatmeal|porridge/, label: "Oats (bowl)", macros: { protein: 12, carbs: 54, fat: 7, kcal: 320 } },
  { keys: /chicken breast|grilled chicken|chicken/, label: "Chicken (150 g)", macros: { protein: 45, carbs: 0, fat: 6, kcal: 250 } },
  { keys: /\beggs?\b|omelette|\bande\b|\banda\b/, label: "Egg", macros: { protein: 6, carbs: 0.5, fat: 5, kcal: 72 } },
  { keys: /paneer/, label: "Paneer (100 g)", macros: { protein: 18, carbs: 4, fat: 20, kcal: 265 } },
  { keys: /soy(a)? chunks/, label: "Soya chunks (50 g)", macros: { protein: 26, carbs: 16, fat: 0.5, kcal: 170 } },
  { keys: /greek yog(h)?urt|curd|dahi|yog(h)?urt/, label: "Curd / yogurt (200 g)", macros: { protein: 18, carbs: 8, fat: 6, kcal: 160 } },
  { keys: /\bdal\b|lentils?/, label: "Dal (bowl)", macros: { protein: 12, carbs: 30, fat: 5, kcal: 220 } },
  { keys: /rajma|chole|chana|chickpeas?/, label: "Rajma / chole (bowl)", macros: { protein: 14, carbs: 40, fat: 6, kcal: 280 } },
  { keys: /\brice\b|biryani/, label: "Rice (plate)", macros: { protein: 5, carbs: 60, fat: 1, kcal: 270 } },
  { keys: /roti|chapati|chapatti/, label: "Roti", macros: { protein: 3, carbs: 18, fat: 3, kcal: 110 } },
  { keys: /peanut butter/, label: "Peanut butter (2 tbsp)", macros: { protein: 8, carbs: 6, fat: 16, kcal: 190 } },
  { keys: /banana|kela/, label: "Banana", macros: { protein: 1, carbs: 27, fat: 0.3, kcal: 105 } },
  { keys: /milk|doodh|shake|smoothie/, label: "Milk / shake (300 ml)", macros: { protein: 10, carbs: 15, fat: 10, kcal: 190 } },
  { keys: /fish|salmon|tuna/, label: "Fish (150 g)", macros: { protein: 35, carbs: 0, fat: 8, kcal: 220 } },
  { keys: /pasta/, label: "Pasta (plate)", macros: { protein: 12, carbs: 75, fat: 4, kcal: 380 } },
  { keys: /bread|toast/, label: "Bread (slice)", macros: { protein: 3, carbs: 13, fat: 1, kcal: 75 } },
  { keys: /nuts|almonds|badam|cashew/, label: "Nuts (handful)", macros: { protein: 6, carbs: 6, fat: 14, kcal: 170 } },
];

const CARDIO: { keys: RegExp; label: string; kcalPerMin: number }[] = [
  { keys: /\b(run|ran|running|jog|jogged|jogging)\b/, label: "Running", kcalPerMin: 11 },
  { keys: /\b(cycl(e|ed|ing)|bike|biked|spin)\b/, label: "Cycling", kcalPerMin: 8 },
  { keys: /\b(swim|swam|swimming)\b/, label: "Swimming", kcalPerMin: 9 },
  { keys: /\b(cardio|hiit|treadmill|skipping|jump rope|conditioning|sprints?)\b/, label: "Cardio / conditioning", kcalPerMin: 10 },
];

const RED_FLAGS: { re: RegExp; reason: string }[] = [
  { re: /chest.{0,25}(pain|hurt|tight|pressure)/, reason: "Chest pain" },
  { re: /faint|passed out|black(ed)? out|collapsed?/, reason: "Fainting / collapse" },
  { re: /(can'?t|cannot|hard to) breathe|short(ness)? of breath/, reason: "Breathing trouble" },
  { re: /(vomit|urine|pee|stool|cough).{0,20}blood|blood.{0,20}(vomit|urine|pee|stool|cough)|dark (brown|cola) (urine|pee)/, reason: "Blood / very dark urine" },
  { re: /steroid|sarms|tren|anabolic|injection/, reason: "Performance drugs" },
  { re: /purg|throw(ing)? up on purpose|starv/, reason: "Possible disordered eating" },
];

const WORD_NUM: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, double: 2, half: 0.5 };

function qtyBefore(text: string, index: number): number {
  const before = text.slice(Math.max(0, index - 14), index).trim().split(/\s+/).slice(-2);
  for (let i = before.length - 1; i >= 0; i--) {
    const w = before[i];
    const n = parseFloat(w);
    if (!isNaN(n) && n > 0 && n < 20) return n;
    if (w in WORD_NUM) return WORD_NUM[w];
  }
  return 1;
}

export function parseLog(input: string): ParseResult {
  const text = input.toLowerCase();
  const events: ParsedEvent[] = [];

  for (const f of RED_FLAGS) if (f.re.test(text)) events.push({ kind: "redflag", reason: f.reason });

  // Weight: "weighed 68.2", "weight 68 kg", "I'm 67.5kg"
  const w = text.match(/\b(weigh(ed|t|ing)?|scale|i'?m|am)\b\D{0,12}(\d{2,3}(\.\d)?)\s*(kg|kgs|kilos)?/);
  if (w && +w[3] > 35 && +w[3] < 160) events.push({ kind: "weight", kg: +w[3] });

  // Water: "1 litre", "500ml", "2 bottles"
  const lit = text.match(/(\d+(\.\d+)?)\s*(l|litre|liter|litres|liters)\b/);
  const ml = text.match(/(\d{2,4})\s*ml\b/);
  const glasses = text.match(/(\d+|a|one|two|three|four)\s*(glass|glasses|bottle|bottles)/);
  if (lit && /water|paani|drank|drink|hydrat/.test(text)) events.push({ kind: "water", ml: Math.round(+lit[1] * 1000) });
  else if (ml && /water|paani|drank|drink|hydrat/.test(text)) events.push({ kind: "water", ml: +ml[1] });
  else if (glasses && /water|paani/.test(text)) {
    const n = WORD_NUM[glasses[1]] ?? +glasses[1];
    events.push({ kind: "water", ml: n * (/bottle/.test(glasses[2]) ? 750 : 250) });
  }

  // Food — first matching pattern wins per chunk, so "protein oats" isn't also logged as "oats".
  const chunks = text.split(/,|\band\b|\baur\b|\bwith\b|\+|\bthen\b|\bplus\b/);
  for (const chunk of chunks) {
    const c = ` ${chunk.trim()} `;
    const f = FOODS.find((f) => f.keys.test(c));
    if (!f) continue;
    const m = c.match(f.keys)!;
    const qty = qtyBefore(c, m.index ?? 0);
    events.push({
      kind: "food",
      label: f.label,
      qty,
      macros: {
        protein: Math.round(f.macros.protein * qty),
        carbs: Math.round(f.macros.carbs * qty),
        fat: Math.round(f.macros.fat * qty),
        kcal: Math.round(f.macros.kcal * qty),
      },
    });
  }
  // "protein oats" was split by "with"? re-check full text once if no food found
  if (!events.some((e) => e.kind === "food")) {
    const f = FOODS.find((f) => f.keys.test(text));
    if (f) events.push({ kind: "food", label: f.label, qty: 1, macros: { ...f.macros } });
  }

  // Cardio: "ran 5k", "30 min cycling", "1 hour conditioning"
  const cardio = CARDIO.find((c) => c.keys.test(text));
  if (cardio) {
    let minutes = 30;
    const mins = text.match(/(\d+)\s*(min|mins|minutes)/);
    const hrs = text.match(/(\d+(\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
    const km = text.match(/(\d+(\.\d+)?)\s*(k|km)\b/);
    if (mins) minutes = +mins[1];
    else if (hrs) minutes = Math.round(+hrs[1] * 60);
    else if (km) minutes = Math.round(+km[1] * 6);
    events.push({ kind: "cardio", label: cardio.label, minutes, kcal: Math.round(minutes * cardio.kcalPerMin) });
  }

  const parts: string[] = [];
  for (const e of events) {
    if (e.kind === "food") parts.push(`${e.qty !== 1 ? e.qty + "× " : ""}${e.label} (+${e.macros.protein} g protein)`);
    if (e.kind === "water") parts.push(`${e.ml} ml water`);
    if (e.kind === "cardio") parts.push(`${e.minutes} min ${e.label.toLowerCase()} (≈${e.kcal} kcal burned)`);
    if (e.kind === "weight") parts.push(`weigh-in ${e.kg} kg`);
  }
  const unknown = events.length === 0;
  return {
    events,
    unknown,
    summary: unknown
      ? "I couldn't match that to a food, drink, workout or weigh-in. Try e.g. “3 eggs and toast” or “drank 1 litre water”."
      : `Logged: ${parts.join(" · ") || "safety check"}`,
  };
}

// High-protein options to close a gap (whole foods, no supplements suggested).
export const PROTEIN_MEALS = [
  { name: "Grilled chicken + rice bowl", text: "chicken and rice", protein: 50 },
  { name: "Paneer bhurji with 2 roti", text: "paneer with 2 roti", protein: 24 },
  { name: "4-egg omelette + toast", text: "4 eggs and 2 toast", protein: 30 },
  { name: "Soya chunk curry + rice", text: "soya chunks and rice", protein: 31 },
  { name: "Curd + banana + nuts", text: "curd, banana, nuts", protein: 25 },
  { name: "Fish curry + rice", text: "fish and rice", protein: 40 },
];
