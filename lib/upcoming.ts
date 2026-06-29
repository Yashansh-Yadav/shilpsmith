import { unstable_cache } from "next/cache";
import { MhahPanchang } from "mhah-panchang";

import { normalizeTithi, tithiNameToIno } from "./panchang";
import { DEITIES_TAG, deityTag } from "./cache";
import type { SpecialDayConfig } from "./observance";

// Computes the deity's upcoming dated events for the rest of the current year.
// Recurring rules are lunar (tithi/paksha), so the only way to get real
// calendar dates is to walk each remaining day and resolve its tithi via the
// local panchang engine. Festival-date rules are added directly. Weekday-only
// rules are intentionally excluded — "every Monday" is a weekly habit, not an
// event. The whole scan is cached per (deity, day) so it runs at most once a
// day, and the deity's cache tag busts it the moment an admin edits the rules.

export interface UpcomingEvent {
  date: string; // YYYY-MM-DD
  labelEn: string;
  labelHi: string;
  note?: string;
  noteHi?: string;
}

const DAY_MS = 86_400_000;

function tithiMatch(
  configTithi: string,
  tithiIno: number,
  tithiKey: string
): boolean {
  // Primary: tithi index (handles mhah's regional spellings).
  const target = tithiNameToIno(configTithi);
  if (target >= 0 && tithiIno >= 0) return target === tithiIno;
  // Fallback: tolerant string compare for custom names.
  if (!tithiKey) return false;
  const a = normalizeTithi(configTithi);
  if (!a) return false;
  return a === tithiKey || a.startsWith(tithiKey) || tithiKey.startsWith(a);
}

function daysApart(a: string, b: string): number {
  return Math.abs(
    (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS
  );
}

function compute(
  specialDays: SpecialDayConfig[],
  fromDateKey: string
): UpcomingEvent[] {
  const year = Number(fromDateKey.slice(0, 4));
  const rules = Array.isArray(specialDays) ? specialDays : [];
  const events: UpcomingEvent[] = [];

  // Fixed festival dates within this year, from today onward.
  for (const d of rules) {
    if (!Array.isArray(d.festivalDates)) continue;
    for (const fd of d.festivalDates) {
      if (fd >= fromDateKey && fd.startsWith(String(year))) {
        events.push({
          date: fd,
          labelEn: d.labelEn,
          labelHi: d.labelHi,
          note: d.note,
          noteHi: d.noteHi,
        });
      }
    }
  }

  // Tithi rules — scan today..Dec 31, sampling each day at ~06:00 IST.
  const tithiRules = rules.filter((d) => d.tithi && d.tithi.trim());
  if (tithiRules.length) {
    const obj = new MhahPanchang();
    const start = Date.parse(`${fromDateKey}T00:30:00.000Z`);
    const end = Date.UTC(year, 11, 31, 0, 30, 0);
    for (let t = start; t <= end; t += DAY_MS) {
      const at = new Date(t);
      const dateKey = at.toISOString().slice(0, 10);
      let c: { Tithi?: { ino?: number; name_en_IN?: string }; Paksha?: { name_en_IN?: string } };
      try {
        c = obj.calculate(at);
      } catch {
        continue;
      }
      // ino is month-absolute (Shukla 0–14, Krishna 15–29) — reduce to a
      // paksha-relative index for matching.
      const rawIno = c?.Tithi?.ino ?? -1;
      const ino = rawIno >= 0 ? rawIno % 15 : -1;
      const pakshaEn = c?.Paksha?.name_en_IN ?? "";
      const isShukla = /shukla/i.test(pakshaEn);
      const tithiEn =
        ino === 14
          ? isShukla
            ? "Purnima"
            : "Amavasya"
          : c?.Tithi?.name_en_IN ?? "";
      const tithiKey = normalizeTithi(tithiEn);

      for (const d of tithiRules) {
        if (!tithiMatch(d.tithi as string, ino, tithiKey)) continue;
        if (d.paksha && !pakshaEn.toLowerCase().startsWith(d.paksha)) continue;
        events.push({
          date: dateKey,
          labelEn: d.labelEn,
          labelHi: d.labelHi,
          note: d.note,
          noteHi: d.noteHi,
        });
      }
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.labelEn.localeCompare(b.labelEn));

  // A tithi can land on the 06:00 sample of two adjacent days; collapse such
  // near-duplicate occurrences of the same label (≤2 days apart).
  const out: UpcomingEvent[] = [];
  const lastDateForLabel: Record<string, string> = {};
  for (const e of events) {
    const prev = lastDateForLabel[e.labelEn];
    if (prev && daysApart(prev, e.date) <= 2) continue;
    out.push(e);
    lastDateForLabel[e.labelEn] = e.date;
  }
  return out;
}

// Cached per deity + day. Tagged so admin rule edits invalidate immediately.
export async function getUpcomingEvents(
  key: string,
  specialDays: SpecialDayConfig[],
  fromDateKey: string
): Promise<UpcomingEvent[]> {
  // Cache the day-scan per (deity, day); the deity tag busts it on admin edits.
  // specialDays is passed as an argument so rule edits reflect even within the
  // revalidate window.
  const cached = unstable_cache(
    async (sd: SpecialDayConfig[], from: string) => compute(sd, from),
    ["upcoming", key],
    { tags: [DEITIES_TAG, deityTag(key)], revalidate: 86_400 }
  );
  return cached(specialDays, fromDateKey);
}
