// Supabase cloud sync, with no sign-up and no extra dependency (plain fetch to the REST API).
//
// The publishable key below is designed to be public (it ships to every browser anyway).
// Security comes from Row Level Security in the database: each browser gets a random
// device id and can only read/write rows carrying that id (sent in the x-device-id header).
// The secret Gemini key is NOT here; it lives only in Vercel's environment variables.

import type { ParsedEvent } from "./parser";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sunadcxkozeswwphjyhu.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_tZsvcrZ_fWQqjI-4HFQ2cA_lMihSSUb";

export type CloudLog = { created_at: string; day: string; input: string | null; mode: string | null; events: ParsedEvent[]; summary: string | null; coach: string | null };
export type CloudWeighIn = { day: string; kg: number };

export const localDay = (d = new Date()) => {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

export function deviceId(): string {
  try {
    let id = localStorage.getItem("bb_device");
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
      localStorage.setItem("bb_device", id);
    }
    return id;
  } catch {
    return "00000000-0000-4000-8000-000000000000";
  }
}

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      "x-device-id": deviceId(),
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}

export async function saveLog(l: { input: string; mode: string; events: ParsedEvent[]; summary?: string; coach?: string }) {
  await rest("logs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      device_id: deviceId(),
      day: localDay(),
      input: l.input.slice(0, 1500),
      mode: l.mode,
      events: l.events,
      summary: (l.summary || "").slice(0, 600),
      coach: (l.coach || "").slice(0, 400),
    }),
  });
}

export async function saveWeighIn(day: string, kg: number) {
  await rest("weigh_ins?on_conflict=device_id,day", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ device_id: deviceId(), day, kg }),
  });
}

export async function loadToday(): Promise<CloudLog[]> {
  const id = deviceId();
  return (await rest(`logs?device_id=eq.${id}&day=eq.${localDay()}&order=created_at.asc&select=created_at,day,input,mode,events,summary,coach`)) || [];
}

export async function loadWeighIns(): Promise<CloudWeighIn[]> {
  const id = deviceId();
  const rows = (await rest(`weigh_ins?device_id=eq.${id}&order=day.asc&select=day,kg`)) || [];
  return rows.map((r: any) => ({ day: r.day, kg: Number(r.kg) }));
}

export async function clearCloud() {
  const id = deviceId();
  await rest(`logs?device_id=eq.${id}`, { method: "DELETE" });
  await rest(`weigh_ins?device_id=eq.${id}`, { method: "DELETE" });
}
