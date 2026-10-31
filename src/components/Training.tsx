"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PROTEIN_MEALS, type Macros, type ParseResult } from "@/lib/parser";
import { fileToJpeg } from "@/lib/ai";

// ---------- Profile & example targets (edit for your athlete) ----------
export const BASELINE_KG = 66;
export const TARGET_KG = 75;
export const WATER_GOAL_ML = 4000;
export const TARGETS: Macros = { protein: 145, carbs: 400, fat: 85, kcal: 3100 };

export type WeighIn = { date: string; kg: number };
export type DayLog = {
  macros: Macros;
  waterMl: number;
  cardio: { label: string; minutes: number; kcal: number }[];
  feed: { at: string; text: string; result: ParseResult }[];
};

export const emptyDay = (): DayLog => ({ macros: { protein: 0, carbs: 0, fat: 0, kcal: 0 }, waterMl: 0, cardio: [], feed: [] });

// Made-up seed data so the chart isn't empty on first open.
export function seedWeighIns(): WeighIn[] {
  const kgs = [66.0, 66.4, 66.9, 67.3, 67.6, 68.1];
  return kgs.map((kg, i) => {
    const d = new Date(Date.now() - (kgs.length - 1 - i) * 7 * 864e5);
    return { date: d.toISOString().slice(0, 10), kg };
  });
}

const card = "rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 shadow-lg shadow-black/20";
const label = "text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400";

// ---------- 1. Hypertrophy Milestone Tracker ----------
export function WeightTracker({ weighIns, onAdd }: { weighIns: WeighIn[]; onAdd: (kg: number) => void }) {
  const [val, setVal] = useState("");
  const latest = weighIns[weighIns.length - 1]?.kg ?? BASELINE_KG;
  const pct = Math.max(0, Math.min(100, ((latest - BASELINE_KG) / (TARGET_KG - BASELINE_KG)) * 100));

  // Average weekly gain → projected arrival.
  const first = weighIns[0];
  const weeks = first ? Math.max(1, (Date.parse(weighIns[weighIns.length - 1].date) - Date.parse(first.date)) / (7 * 864e5)) : 1;
  const perWeek = first ? (latest - first.kg) / weeks : 0;
  const weeksLeft = perWeek > 0 ? Math.ceil((TARGET_KG - latest) / perWeek) : null;

  // SVG chart geometry
  const W = 320, H = 170, P = { l: 30, r: 12, t: 12, b: 22 };
  const yMin = 64, yMax = 76;
  const x = (i: number) => P.l + (weighIns.length <= 1 ? 0 : (i / (weighIns.length - 1)) * (W - P.l - P.r));
  const y = (kg: number) => P.t + (1 - (kg - yMin) / (yMax - yMin)) * (H - P.t - P.b);
  const path = weighIns.map((w, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(w.kg).toFixed(1)}`).join(" ");
  const area = weighIns.length ? `${path} L${x(weighIns.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z` : "";
  const milestones = [68, 70, 72, 75];

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={label}>Hypertrophy milestones</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {latest.toFixed(1)}<span className="text-base font-medium text-zinc-400"> kg</span>
          </p>
          <p className="text-sm text-zinc-400">
            {BASELINE_KG} → {TARGET_KG} kg · <span className="text-lime-400">+{(latest - BASELINE_KG).toFixed(1)} kg</span>
            {perWeek > 0 && <> · {perWeek.toFixed(2)} kg/wk</>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-lime-400 tabular-nums">{Math.round(pct)}%</p>
          <p className="text-xs text-zinc-400">{weeksLeft ? `~${weeksLeft} wks to go` : "log weigh-ins"}</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Weight progress chart">
        <defs>
          <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a3e635" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[64, 66, 68, 70, 72, 74, 76].map((g) => (
          <g key={g}>
            <line x1={P.l} x2={W - P.r} y1={y(g)} y2={y(g)} stroke="#ffffff" strokeOpacity="0.06" />
            <text x={P.l - 6} y={y(g) + 3} textAnchor="end" fontSize="9" fill="#71717a">{g}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={y(TARGET_KG)} y2={y(TARGET_KG)} stroke="#a3e635" strokeDasharray="4 4" strokeOpacity="0.8" />
        <text x={W - P.r} y={y(TARGET_KG) - 4} textAnchor="end" fontSize="9" fill="#a3e635">Target {TARGET_KG} kg</text>
        <line x1={P.l} x2={W - P.r} y1={y(BASELINE_KG)} y2={y(BASELINE_KG)} stroke="#71717a" strokeDasharray="2 4" />
        {area && <path d={area} fill="url(#wg)" />}
        {path && <path d={path} fill="none" stroke="#a3e635" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {weighIns.map((w, i) => (
          <circle key={w.date + i} cx={x(i)} cy={y(w.kg)} r={i === weighIns.length - 1 ? 4.5 : 3} fill="#18181b" stroke="#a3e635" strokeWidth="2" />
        ))}
        {weighIns.length > 1 && (
          <>
            <text x={x(0)} y={H - 6} fontSize="9" fill="#71717a">{weighIns[0].date.slice(5)}</text>
            <text x={x(weighIns.length - 1)} y={H - 6} fontSize="9" fill="#71717a" textAnchor="end">{weighIns[weighIns.length - 1].date.slice(5)}</text>
          </>
        )}
      </svg>

      <div className="mt-2 grid grid-cols-4 gap-2">
        {milestones.map((m) => {
          const hit = latest >= m;
          return (
            <div key={m} className={`rounded-xl border px-2 py-2 text-center text-xs ${hit ? "border-lime-400/50 bg-lime-400/10 text-lime-300" : "border-white/10 text-zinc-400"}`}>
              <div className="text-sm font-semibold">{hit ? "✓" : "○"} {m} kg</div>
              <div className="text-[10px]">{m === TARGET_KG ? "Goal" : hit ? "Reached" : `${(m - latest).toFixed(1)} to go`}</div>
            </div>
          );
        })}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const kg = parseFloat(val);
          if (kg > 35 && kg < 160) { onAdd(kg); setVal(""); }
        }}
      >
        <input
          inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Today's weigh-in (kg)"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-lime-400/60"
        />
        <button className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 active:scale-95">Add</button>
      </form>
    </section>
  );
}

// ---------- 2. High-Volume Hydration Tracker ----------
export function HydrationRing({ ml, onAdd }: { ml: number; onAdd: (ml: number) => void }) {
  const pct = Math.min(1, ml / WATER_GOAL_ML);
  const r = 52, c = 2 * Math.PI * r;
  return (
    <section className={card}>
      <p className={label}>Hydration · {WATER_GOAL_ML / 1000} L goal</p>
      <div className="mt-3 flex items-center gap-5">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="10" />
            <circle
              cx="60" cy="60" r={r} fill="none" stroke="url(#hg)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700"
            />
            <defs>
              <linearGradient id="hg" x1="0" x2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-2xl font-bold tabular-nums">{(ml / 1000).toFixed(2)}<span className="text-sm text-zinc-400"> L</span></div>
              <div className="text-xs text-zinc-400">{Math.round(pct * 100)}%</div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {[250, 500, 750].map((v) => (
            <button key={v} onClick={() => onAdd(v)} className="w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 active:scale-95">
              + {v} ml
            </button>
          ))}
          <p className="text-xs text-zinc-400">
            {ml >= WATER_GOAL_ML ? "Goal hit 💧" : `${((WATER_GOAL_ML - ml) / 1000).toFixed(2)} L left · ≈${Math.ceil((WATER_GOAL_ML - ml) / 750)} bottles`}
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------- Macro bars ----------
export function MacroBars({ macros, extraKcal }: { macros: Macros; extraKcal: number }) {
  const rows: { k: keyof Macros; name: string; unit: string; color: string; target: number }[] = [
    { k: "protein", name: "Protein", unit: "g", color: "bg-rose-400", target: TARGETS.protein },
    { k: "carbs", name: "Carbs", unit: "g", color: "bg-amber-300", target: TARGETS.carbs },
    { k: "fat", name: "Fat", unit: "g", color: "bg-violet-400", target: TARGETS.fat },
    { k: "kcal", name: "Energy", unit: "kcal", color: "bg-lime-400", target: TARGETS.kcal + extraKcal },
  ];
  return (
    <section className={card}>
      <p className={label}>Today&apos;s fuel</p>
      <div className="mt-3 space-y-3">
        {rows.map((r) => {
          const v = macros[r.k];
          const pct = Math.min(100, (v / r.target) * 100);
          return (
            <div key={r.k}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{r.name}</span>
                <span className="tabular-nums text-zinc-400"><span className="text-zinc-100">{v}</span> / {r.target} {r.unit}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${r.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-zinc-500">Example targets for a 66→75 kg bulk. Confirm yours with your coach or a sports dietitian.</p>
    </section>
  );
}

// ---------- 3. AI Log Simulator ----------
const EXAMPLES = ["I just ate protein oats", "subah 4 ande aur 2 roti, practice ke baad banana shake", "3 eggs, 2 toast and a banana", "drank 1 litre water", "chicken and rice after training", "ran 5k this morning", "weighed 68.4 kg"];

type Img = { mime: string; data: string; preview: string };

export function AILog({ onLog, feed, mode }: { onLog: (text: string, image?: Img | null) => Promise<void>; feed: DayLog["feed"]; mode: "live" | "demo" | null }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<Img | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  async function submit(t = text) {
    if ((!t.trim() && !image) || busy) return;
    setBusy(true);
    await onLog(t.trim(), image);
    setText("");
    setImage(null);
    setBusy(false);
  }

  function mic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input works in Chrome. You can also use your keyboard's mic."); return; }
    if (recRef.current) { recRef.current.stop(); return; }
    const rec = new SR();
    rec.lang = "en-IN"; rec.interimResults = true;
    rec.onresult = (e: any) => setText(Array.from(e.results).map((r: any) => r[0].transcript).join(" "));
    rec.onend = () => { recRef.current = null; setListening(false); };
    recRef.current = rec; setListening(true); rec.start();
  }

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <p className={label}>AI log · voice, text or meal photo</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${mode === "live" ? "bg-lime-400/15 text-lime-300" : "bg-fuchsia-500/15 text-fuchsia-300"}`}>
          {mode === "live" ? "AI LIVE" : mode === "demo" ? "DEMO MODE (rules)" : "AI"}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={mic} aria-label="Voice note"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${listening ? "animate-pulse border-rose-400 bg-rose-500/20" : "border-white/10 bg-zinc-950"}`}
        >🎙️</button>
        <label aria-label="Meal photo" className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/10 bg-zinc-950">
          📷
          <input type="file" accept="image/*" capture="environment" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImage(await fileToJpeg(f)); e.target.value = ""; }} />
        </label>
        <input
          value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="“I just ate protein oats”"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm outline-none focus:border-fuchsia-400/60"
        />
        <button onClick={() => submit()} disabled={busy} className="rounded-xl bg-fuchsia-500 px-4 text-sm font-semibold text-white disabled:opacity-60 active:scale-95">
          {busy ? "…" : "Log"}
        </button>
      </div>
      {image && (
        <div className="relative mt-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.preview} alt="Meal photo to log" className="h-20 rounded-lg" />
          <button onClick={() => setImage(null)} className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-zinc-800 text-xs">✕</button>
        </div>
      )}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => submit(ex)} className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 hover:border-fuchsia-400/50">
            {ex}
          </button>
        ))}
      </div>
      {feed.length > 0 && (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {[...feed].reverse().map((f, i) => (
            <li key={f.at + i} className="rounded-xl bg-zinc-950/70 p-3 text-sm">
              <div className="text-zinc-400">“{f.text || "📷 photo"}” <span className="text-[10px]">· {new Date(f.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {f.result.mode === "live" ? "AI" : "rules"}</span></div>
              <div className={`mt-1 ${f.result.unknown ? "text-amber-300" : "text-zinc-100"}`}>🤖 {f.result.summary}</div>
              {f.result.coach && <div className="mt-1 text-lime-300">→ {f.result.coach}</div>}
              {f.result.askBack && !f.result.unknown && <div className="mt-1 text-amber-300">? {f.result.askBack}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- 4. Macro Recovery Nudge ----------
export function ProteinNudge({ protein, hour, onLog }: { protein: number; hour: number; onLog: (text: string) => void }) {
  // How much protein "should" be in by now, spread across 07:00–22:00.
  const frac = Math.max(0, Math.min(1, (hour - 7) / 15));
  const expected = Math.round(TARGETS.protein * frac);
  const gap = TARGETS.protein - protein;
  const behind = expected - protein;
  if (frac === 0 || behind < 20 || gap <= 0) return null;
  const meal = [...PROTEIN_MEALS].sort((a, b) => Math.abs(a.protein - Math.min(behind, 50)) - Math.abs(b.protein - Math.min(behind, 50)))[0];
  return (
    <section className="rounded-2xl border border-rose-400/40 bg-gradient-to-br from-rose-500/20 to-orange-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🍗</div>
        <div className="flex-1">
          <p className="font-semibold text-rose-100">Recovery nudge: you&apos;re {behind} g protein behind pace</p>
          <p className="mt-1 text-sm text-rose-100/80">
            By {hour}:00 you&apos;d typically be near {expected} g; you&apos;re at {protein} g. Close the gap with <b>{meal.name}</b> (~{meal.protein} g protein).
          </p>
          <button onClick={() => onLog(meal.text)} className="mt-3 rounded-xl bg-rose-400 px-3 py-2 text-sm font-semibold text-zinc-950 active:scale-95">
            I ate this — log it
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------- 5. Cardio energy warning ----------
export function CardioWarning({ cardio }: { cardio: DayLog["cardio"] }) {
  if (!cardio.length) return null;
  const kcal = cardio.reduce((s, c) => s + c.kcal, 0);
  const mins = cardio.reduce((s, c) => s + c.minutes, 0);
  return (
    <section role="alert" className="rounded-2xl border border-amber-400/50 bg-amber-400/10 p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div>
          <p className="font-semibold text-amber-200">Aerobic work logged: {mins} min · ≈{kcal} kcal burned</p>
          <p className="mt-1 text-sm text-amber-100/80">
            That energy comes out of your mass-building surplus. Your energy target has gone up by {kcal} kcal today. Eat it back
            (e.g. a shake + banana + peanut-butter toast ≈ 560 kcal), or you&apos;ll stall. Keep any conditioning your coach programmes;
            just don&apos;t add extra cardio on top during the bulk.
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------- Red-flag card ----------
export function RedFlag({ reasons, onClose }: { reasons: string[]; onClose: () => void }) {
  if (!reasons.length) return null;
  return (
    <section role="alert" className="rounded-2xl border border-red-500/60 bg-red-600/15 p-4">
      <p className="font-semibold text-red-200">🚩 {reasons.join(", ")}</p>
      <p className="mt-1 text-sm text-red-100/85">
        This isn&apos;t something to log and train through. Stop training and talk to a doctor or your team physio today. If it&apos;s severe
        or sudden (chest pain, collapse, can&apos;t breathe), call 112 now.
      </p>
      <button onClick={onClose} className="mt-2 text-xs text-red-200 underline">Dismiss</button>
    </section>
  );
}

// ---------- Hook: persisted state (browser only, no backend) ----------
export function useLocalState<T>(key: string, init: () => T) {
  const [v, setV] = useState<T>(init);
  const loaded = useRef(false);
  useEffect(() => {
    try { const s = localStorage.getItem(key); if (s) setV(JSON.parse(s)); } catch {}
    loaded.current = true;
  }, [key]);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV] as const;
}

export function useHour(override: number | null) {
  const [h, setH] = useState(12);
  useEffect(() => {
    const upd = () => setH(new Date().getHours());
    upd();
    const t = setInterval(upd, 60_000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => override ?? h, [override, h]);
}
