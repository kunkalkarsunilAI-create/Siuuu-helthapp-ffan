"use client";

import { useEffect, useState } from "react";
import { analyzeLog } from "@/lib/ai";
import { clearCloud, loadToday, loadWeighIns, localDay, saveLog, saveWeighIn } from "@/lib/db";
import type { ParsedEvent, ParseResult } from "@/lib/parser";
import FanZone from "@/components/FanZone";
import AuthBar from "@/components/AuthBar";
import {
  AILog, CardioWarning, HydrationRing, MacroBars, ProteinNudge, RedFlag, WeightTracker,
  emptyDay, seedWeighIns, useHour, useLocalState, type DayLog, type WeighIn,
} from "@/components/Training";

const today = () => localDay();

// Fold logged events into the day's totals (used for new logs and when restoring from the cloud).
function applyEvents(d: DayLog, events: ParsedEvent[], feedItem?: DayLog["feed"][number]): DayLog {
  const m = { ...d.macros };
  let waterMl = d.waterMl;
  const cardio = [...d.cardio];
  for (const e of events) {
    if (e.kind === "food") { m.protein += e.macros.protein; m.carbs += e.macros.carbs; m.fat += e.macros.fat; m.kcal += e.macros.kcal; }
    if (e.kind === "water") waterMl += e.ml;
    if (e.kind === "cardio") cardio.push({ label: e.label, minutes: e.minutes, kcal: e.kcal });
  }
  return { macros: m, waterMl, cardio, feed: feedItem ? [...d.feed, feedItem].slice(-30) : d.feed };
}

type Cloud = "off" | "syncing" | "saved" | "error";

export default function Home() {
  const [tab, setTab] = useState<"train" | "fan">("train");
  const [weighIns, setWeighIns] = useLocalState<WeighIn[]>("bb_weights", seedWeighIns);
  const [stored, setStored] = useLocalState<{ date: string; log: DayLog }>("bb_day", () => ({ date: today(), log: emptyDay() }));
  const [hourOverride, setHourOverride] = useState<number | null>(null);
  const [flags, setFlags] = useState<string[]>([]);
  const [mode, setMode] = useState<"live" | "demo" | null>(null);
  const [forceDemo, setForceDemo] = useState(false);
  const [cloud, setCloud] = useState<Cloud>("off");
  const hour = useHour(hourOverride);

  // New day → fresh log.
  const day = stored.date === today() ? stored.log : emptyDay();
  const setDay = (fn: (d: DayLog) => DayLog) => setStored((s) => ({ date: today(), log: fn(s.date === today() ? s.log : emptyDay()) }));

  // Cloud save wrapper: never blocks the UI; shows status in the header.
  function sync(p: Promise<unknown>) {
    setCloud("syncing");
    p.then(() => setCloud("saved")).catch((e) => { console.warn(e); setCloud("error"); });
  }

  // On open: restore today's log and weigh-ins from Supabase (e.g. after clearing the browser).
  useEffect(() => {
    let alive = true;
    setCloud("syncing");
    Promise.all([loadToday(), loadWeighIns()])
      .then(([logs, wis]) => {
        if (!alive) return;
        if (logs.length) {
          let d = emptyDay();
          for (const l of logs) {
            const result: ParseResult = { events: l.events || [], summary: l.summary || "", unknown: !(l.events || []).length, mode: l.mode === "live" ? "live" : "demo", coach: l.coach || "" };
            d = applyEvents(d, l.events || [], l.mode === "button" ? undefined : { at: l.created_at, text: l.input || "", result });
          }
          setStored({ date: today(), log: d });
        }
        if (wis.length) {
          setWeighIns((w) => {
            const cloudDays = new Set(wis.map((x) => x.day));
            return [...w.filter((x) => !cloudDays.has(x.date)), ...wis.map((x) => ({ date: x.day, kg: x.kg }))].sort((a, b) => a.date.localeCompare(b.date));
          });
        }
        setCloud("saved");
      })
      .catch((e) => { console.warn(e); if (alive) setCloud("error"); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addWeight(kg: number) {
    setWeighIns((w) => {
      const rest = w.filter((x) => x.date !== today());
      return [...rest, { date: today(), kg }];
    });
    sync(saveWeighIn(today(), kg));
  }

  function addWater(ml: number) {
    const events: ParsedEvent[] = [{ kind: "water", ml }];
    setDay((d) => applyEvents(d, events));
    sync(saveLog({ input: `+${ml} ml button`, mode: "button", events }));
  }

  async function handleLog(text: string, image?: { mime: string; data: string } | null) {
    const result = await analyzeLog({
      text,
      image: image ? { mime: image.mime, data: image.data } : null,
      totals: { ...day.macros, waterMl: day.waterMl },
      recent: day.feed.slice(-5).map((f) => f.text),
      forceDemo,
    });
    setMode(result.mode ?? "demo");
    const red = result.events.flatMap((e) => (e.kind === "redflag" ? [e.reason] : []));
    if (red.length) setFlags(red);
    for (const e of result.events) if (e.kind === "weight") addWeight(e.kg);
    setDay((d) => applyEvents(d, result.events, { at: new Date().toISOString(), text: text || (image ? "📷 photo" : ""), result }));
    sync(saveLog({ input: text || (image ? "[meal photo]" : ""), mode: result.mode ?? "demo", events: result.events, summary: result.summary, coach: result.coach }));
  }

  const cardioKcal = day.cardio.reduce((s, c) => s + c.kcal, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <header className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime-400 text-lg font-black text-zinc-950">B</div>
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight">BulkBuddy</h1>
          <p className="text-xs text-zinc-400">
            Mass-gain dashboard for footballers ·{" "}
            <span className={cloud === "error" ? "text-amber-400" : cloud === "saved" ? "text-lime-400" : "text-zinc-500"}>
              {cloud === "saved" ? "☁️ saved to cloud" : cloud === "syncing" ? "☁️ syncing…" : cloud === "error" ? "☁️ offline (saved on device)" : "☁️"}
            </span>
          </p>
        </div>
        <AuthBar />
        <nav className="flex rounded-xl border border-white/10 bg-zinc-900 p-1 text-sm">
          {([["train", "Training"], ["fan", "Fan Zone"]] as const).map(([id, name]) => (
            <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-3 py-1.5 font-medium ${tab === id ? "bg-lime-400 text-zinc-950" : "text-zinc-300"}`}>
              {name}
            </button>
          ))}
        </nav>
      </header>

      {tab === "train" ? (
        <main className="space-y-4">
          <RedFlag reasons={flags} onClose={() => setFlags([])} />
          <ProteinNudge protein={day.macros.protein} hour={hour} onLog={handleLog} />
          <CardioWarning cardio={day.cardio} />

          <div className="grid gap-4 md:grid-cols-2">
            <WeightTracker weighIns={weighIns} onAdd={addWeight} />
            <div className="space-y-4">
              <HydrationRing ml={day.waterMl} onAdd={addWater} />
              <MacroBars macros={day.macros} extraKcal={cardioKcal} />
            </div>
          </div>

          <AILog onLog={handleLog} feed={day.feed} mode={forceDemo ? "demo" : mode} />

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/10 p-3 text-xs text-zinc-400">
            <span>Demo controls · pretend it&apos;s</span>
            {[null, 9, 13, 18, 21].map((h) => (
              <button key={String(h)} onClick={() => setHourOverride(h)} className={`rounded-full border px-2.5 py-1 ${hourOverride === h ? "border-lime-400 text-lime-300" : "border-white/10"}`}>
                {h === null ? "now" : `${h}:00`}
              </button>
            ))}
            <label className="flex items-center gap-1"><input type="checkbox" checked={forceDemo} onChange={(e) => setForceDemo(e.target.checked)} /> demo mode</label>
            <a href="/test" className="rounded-full border border-white/10 px-2.5 py-1">AI test bench</a>
            <button
              onClick={() => { if (confirm("Reset today's log and weigh-ins to the sample data?")) { setStored({ date: today(), log: emptyDay() }); setWeighIns(seedWeighIns()); setFlags([]); sync(clearCloud()); } }}
              className="ml-auto rounded-full border border-white/10 px-2.5 py-1"
            >Reset</button>
          </div>
        </main>
      ) : (
        <main><FanZone /></main>
      )}

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-zinc-950/90 px-4 py-2.5 text-center text-[11px] text-zinc-300 backdrop-blur">
        ⚕️ <b>Not Medical Advice.</b> Does not diagnose or prescribe. See a doctor for red-flag symptoms.
      </footer>
    </div>
  );
}
