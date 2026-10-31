// SIMULATED football data for the Fan Zone. Not real scores.

export type League = { id: string; name: string; short: string; color: string };
export type Match = {
  id: string;
  league: string;
  home: string;
  away: string;
  hs: number;
  as: number;
  minute: number; // 0 = not started, 46-ish = HT handled via status
  status: "LIVE" | "HT" | "FT" | "UPCOMING";
  kickoff?: string; // for upcoming
};

export const LEAGUES: League[] = [
  { id: "pl", name: "Premier League", short: "PL", color: "#a855f7" },
  { id: "ucl", name: "Champions League", short: "UCL", color: "#3b82f6" },
  { id: "laliga", name: "La Liga", short: "LL", color: "#f97316" },
  { id: "seriea", name: "Serie A", short: "SA", color: "#22c55e" },
  { id: "bund", name: "Bundesliga", short: "BL", color: "#ef4444" },
  { id: "ligue1", name: "Ligue 1", short: "L1", color: "#eab308" },
  { id: "ered", name: "Eredivisie", short: "ED", color: "#06b6d4" },
];

const T: Record<string, string[]> = {
  pl: ["Arsenal", "Liverpool", "Man City", "Chelsea", "Tottenham", "Newcastle", "Aston Villa", "Man United"],
  ucl: ["Real Madrid", "Bayern", "Inter", "PSG", "Barcelona", "Arsenal", "Dortmund", "Benfica"],
  laliga: ["Real Madrid", "Barcelona", "Atlético", "Athletic Club", "Real Sociedad", "Villarreal", "Sevilla", "Betis"],
  seriea: ["Inter", "Napoli", "Juventus", "AC Milan", "Atalanta", "Roma", "Lazio", "Fiorentina"],
  bund: ["Bayern", "Leverkusen", "Dortmund", "Leipzig", "Stuttgart", "Frankfurt", "Freiburg", "Wolfsburg"],
  ligue1: ["PSG", "Marseille", "Monaco", "Lille", "Lyon", "Nice", "Lens", "Rennes"],
  ered: ["PSV", "Ajax", "Feyenoord", "AZ", "Twente", "Utrecht", "Sparta", "Heerenveen"],
};

const KICKOFFS = ["Today 22:30", "Today 23:45", "Tomorrow 00:30", "Sun 18:30", "Sun 21:00", "Tue 00:30"];

export function seedMatches(): Match[] {
  const out: Match[] = [];
  let n = 0;
  for (const l of LEAGUES) {
    const t = T[l.id];
    const states: Match["status"][] = ["LIVE", "LIVE", "FT", "UPCOMING"];
    states.forEach((status, i) => {
      const minute = status === "LIVE" ? 12 + ((n * 17) % 70) : status === "FT" ? 90 : 0;
      const hs = status === "UPCOMING" ? 0 : (n * 7) % 3;
      const as = status === "UPCOMING" ? 0 : (n * 5) % 2;
      out.push({
        id: `${l.id}-${i}`,
        league: l.id,
        home: t[i * 2],
        away: t[i * 2 + 1],
        hs,
        as,
        minute,
        status,
        kickoff: status === "UPCOMING" ? KICKOFFS[n % KICKOFFS.length] : undefined,
      });
      n++;
    });
  }
  return out;
}

// Advance the simulation by one "tick" (~1 match minute).
export function tick(matches: Match[]): { matches: Match[]; goals: string[] } {
  const goals: string[] = [];
  const next = matches.map((m) => {
    if (m.status === "HT") return Math.random() < 0.25 ? { ...m, status: "LIVE" as const, minute: 46 } : m;
    if (m.status !== "LIVE") return m;
    const minute = m.minute + 1;
    if (minute === 46 && m.minute === 45) return { ...m, status: "HT" as const, minute: 45 };
    if (minute > 90 + Math.floor(Math.random() * 5)) return { ...m, status: "FT" as const, minute: 90 };
    let { hs, as } = m;
    if (Math.random() < 0.025) {
      if (Math.random() < 0.55) { hs++; goals.push(`${minute}' GOAL ${m.home}! ${m.home} ${hs}-${as} ${m.away}`); }
      else { as++; goals.push(`${minute}' GOAL ${m.away}! ${m.home} ${hs}-${as} ${m.away}`); }
    }
    return { ...m, minute, hs, as };
  });
  return { matches: next, goals };
}
