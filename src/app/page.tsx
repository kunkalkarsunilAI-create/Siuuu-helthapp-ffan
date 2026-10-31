"use client";

import { useState } from "react";
import { analyzeLog } from "@/lib/ai";
import {
  AILog, CardioWarning, HydrationRing, MacroBars, ProteinNudge, RedFlag, WeightTracker,
  emptyDay, seedWeighIns, useHour, useLocalState, type DayLog, type WeighIn,
} from "@/components/Training";

const today = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [tab, setTab] = useState<"train" | "fan">("train");
  const [weighIns, setWeighIns] = useLocalState<WeighIn[]>("bb_weights", seedWeighIns);
  const [stored, setStored] = useLocalState<{ date: string; log: DayLog }>("bb_day", () => ({ date: today(), log: emptyDay() }));
  const [hourOverride, setHourOverride] = useState<number | null>(null);
  const [flags, setFlags] = useState<string[]>([]);
  const [mode, setMode] = useState<"live" | "demo" | null>(null);
  const [forceDemo, setForceDemo] = useState(false);
  const hour = useHour(hourOverride);

  // New day → fresh log.
  const day = stored.date === today() ? stored.log : emptyDay();
  const setDay = (fn: (d: DayLog) => DayLog) => setStored((s) => ({ date: today(), log: fn(s.date === today() ? s.log : emptyDay()) }));

  function addWeight(kg: number) {
    setWeighIns((w) => {
      const rest = w.filter((x) => x.date !== today());
      return [...rest, { date: today(), kg }];
    });
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
    setDay((d) => {
      const m = { ...d.macros };
      let waterMl = d.waterMl;
      const cardio = [...d.cardio];
      for (const e of result.events) {
        if (e.kind === "food") { m.protein += e.macros.protein; m.carbs += e.macros.carbs; m.fat += e.macros.fat; m.kcal += e.macros.kcal; }
        if (e.kind === "water") waterMl += e.ml;
        if (e.kind === "cardio") cardio.push({ label: e.label, minutes: e.minutes, kcal: e.kcal });
      }
      return { macros: m, waterMl, cardio, feed: [...d.feed, { at: new Date().toISOString(), text, result }].slice(-30) };
    });
  }

  const cardioKcal = day.cardio.reduce((s, c) => s + c.kcal, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <header className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime-400 text-lg font-black text-zinc-950">B</div>
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight">BulkBuddy</h1>
          <p className="text-xs text-zinc-400">Mass-gain dashboard for footballers</p>
        </div>
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
              <HydrationRing ml={day.waterMl} onAdd={(ml) => setDay((d) => ({ ...d, waterMl: d.waterMl + ml }))} />
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
              onClick={() => { if (confirm("Reset today's log and weigh-ins to the sample data?")) { setStored({ date: today(), log: emptyDay() }); setWeighIns(seedWeighIns()); setFlags([]); } }}
              className="ml-auto rounded-full border border-white/10 px-2.5 py-1"
            >Reset</button>
          </div>
        </main>
      ) : (
      )}

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-zinc-950/90 px-4 py-2.5 text-center text-[11px] text-zinc-300 backdrop-blur">
        ⚕️ <b>Not Medical Advice.</b> Does not diagnose or prescribe. See a doctor for red-flag symptoms.
      </footer>
    </div>
  );
}
