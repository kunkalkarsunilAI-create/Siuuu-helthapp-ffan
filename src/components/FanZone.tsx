"use client";

import { useEffect, useState } from "react";
import { LEAGUES, seedMatches, tick, type Match } from "@/lib/fixtures";

function Crest({ name, color }: { name: string; color: string }) {
  // Plain initials badge (no club logos, to avoid trademarked artwork).
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: `${color}55`, border: `1px solid ${color}` }}>
      {initials}
    </span>
  );
}

function StatusPill({ m }: { m: Match }) {
  if (m.status === "LIVE")
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300 tabular-nums">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> {m.minute}&apos;
      </span>
    );
  if (m.status === "HT") return <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">HT</span>;
  if (m.status === "FT") return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">FT</span>;
  return <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[11px] font-semibold text-sky-300">{m.kickoff}</span>;
}

export default function FanZone() {
  const [matches, setMatches] = useState<Match[]>(seedMatches);
  const [league, setLeague] = useState<string>("all");
  const [ticker, setTicker] = useState<string[]>([]);
  const [flash, setFlash] = useState<Set<string>>(new Set());

  // Simulated live clock: 1 match minute every 3 seconds.
  useEffect(() => {
    const t = setInterval(() => {
      setMatches((prev) => {
        const { matches: next, goals } = tick(prev);
        if (goals.length) {
          setTicker((tk) => [...goals, ...tk].slice(0, 6));
          const changed = new Set(next.filter((m, i) => m.hs !== prev[i].hs || m.as !== prev[i].as).map((m) => m.id));
          setFlash(changed);
          setTimeout(() => setFlash(new Set()), 2500);
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const shown = LEAGUES.filter((l) => league === "all" || l.id === league);
  const liveCount = matches.filter((m) => m.status === "LIVE").length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold">Fan Zone</h2>
          <p className="text-xs text-zinc-400">{liveCount} matches live · top 7 competitions</p>
        </div>
        <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-300">SIMULATED SCORES</span>
      </div>

      {ticker.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-lime-400/30 bg-lime-400/10 px-3 py-2 text-sm text-lime-200">
          ⚽ {ticker[0]}
        </div>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {[{ id: "all", short: "All", name: "All", color: "#a3e635" }, ...LEAGUES].map((l) => (
          <button
            key={l.id} onClick={() => setLeague(l.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${league === l.id ? "border-transparent bg-zinc-100 text-zinc-900" : "border-white/10 text-zinc-300"}`}
          >
            {l.id === "all" ? "All" : l.name}
          </button>
        ))}
      </div>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {shown.map((l) => {
          const ms = matches.filter((m) => m.league === l.id);
          const order = { LIVE: 0, HT: 1, UPCOMING: 2, FT: 3 } as const;
          ms.sort((a, b) => order[a.status] - order[b.status]);
          return (
            <section key={l.id} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70">
              <header className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                <h3 className="text-sm font-semibold">{l.name}</h3>
              </header>
              <ul>
                {ms.map((m) => (
                  <li key={m.id} className={`grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0 transition-colors ${flash.has(m.id) ? "bg-lime-400/15" : ""}`}>
                    <div className="space-y-1.5">
                      {[{ n: m.home, s: m.hs, win: m.hs > m.as }, { n: m.away, s: m.as, win: m.as > m.hs }].map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Crest name={t.n} color={l.color} />
                          <span className={`flex-1 truncate text-sm ${m.status === "FT" && !t.win ? "text-zinc-400" : ""}`}>{t.n}</span>
                          {m.status !== "UPCOMING" && <span className="w-5 text-right font-bold tabular-nums">{t.s}</span>}
                        </div>
                      ))}
                    </div>
                    <StatusPill m={m} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="text-center text-[11px] text-zinc-500">All scores and fixtures are simulated for this prototype, not live data. No affiliation with any league or club.</p>
    </div>
  );
}
