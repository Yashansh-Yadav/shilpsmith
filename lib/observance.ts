import type { Panchang } from "./panchang";
import { normalizeTithi, tithiNameToIno } from "./panchang";

// Resolves which of a deity's admin-configured special days apply *today*, given
// the computed Panchang.
//
// A special day is either:
//   - a fixed date (festivalDates) — exact YYYY-MM-DD match, or
//   - a recurring rule — ALL of its specified constraints must hold:
//       weekday   e.g. Monday → Shiva        (no astro needed)
//       tithi     e.g. "Chaturdashi"         (matched against the day's tithi)
//       paksha    "shukla" | "krishna"       (narrows tithi to one fortnight)
// A recurring rule needs at least a weekday or a tithi (paksha alone is half a
// month and never stands on its own).

export interface SpecialDayConfig {
  labelEn: string;
  labelHi: string;
  weekday?: number;
  tithi?: string;
  paksha?: "shukla" | "krishna";
  festivalDates?: string[];
  startDate?: string; // YYYY-MM-DD, inclusive
  endDate?: string; // YYYY-MM-DD, inclusive (defaults to startDate)
  note?: string; // English note
  noteHi?: string; // Hindi note
}

export interface Observance {
  labelEn: string;
  labelHi: string;
  note?: string;
  noteHi?: string;
  reason: "weekday" | "tithi" | "festival" | "range";
}

function tithiMatches(configTithi: string, panchang: Panchang): boolean {
  // Primary: match by tithi index (handles mhah's regional spellings).
  const target = tithiNameToIno(configTithi);
  if (target >= 0 && panchang.tithiIno >= 0) {
    return target === panchang.tithiIno;
  }
  // Fallback for custom/unknown names: tolerant string compare.
  if (!panchang.tithiKey) return false;
  const a = normalizeTithi(configTithi);
  if (!a) return false;
  const b = panchang.tithiKey;
  return a === b || a.startsWith(b) || b.startsWith(a);
}

function pakshaMatches(
  configPaksha: "shukla" | "krishna",
  panchang: Panchang
): boolean {
  return panchang.pakshaEn.toLowerCase().startsWith(configPaksha);
}

export function todaysObservances(
  specialDays: SpecialDayConfig[] | null | undefined,
  panchang: Panchang
): Observance[] {
  if (!Array.isArray(specialDays)) return [];
  const out: Observance[] = [];

  for (const d of specialDays) {
    if (!d || (!d.labelEn && !d.labelHi)) continue;

    let reason: Observance["reason"] | null = null;

    if (
      Array.isArray(d.festivalDates) &&
      d.festivalDates.includes(panchang.date)
    ) {
      reason = "festival";
    } else if (d.startDate) {
      // Active for every day in [startDate, endDate] (endDate defaults to start).
      const end = d.endDate || d.startDate;
      if (panchang.date >= d.startDate && panchang.date <= end) {
        reason = "range";
      }
    }

    if (!reason) {
      const hasBase = d.weekday !== undefined || !!d.tithi;
      if (hasBase) {
        const checks: boolean[] = [];
        if (d.weekday !== undefined) checks.push(d.weekday === panchang.vaarIndex);
        if (d.tithi) checks.push(tithiMatches(d.tithi, panchang));
        if (d.paksha) checks.push(pakshaMatches(d.paksha, panchang));
        if (checks.every(Boolean)) reason = d.tithi ? "tithi" : "weekday";
      }
    }

    if (reason) {
      out.push({
        labelEn: d.labelEn,
        labelHi: d.labelHi,
        note: d.note,
        noteHi: d.noteHi,
        reason,
      });
    }
  }

  // Festivals first, then ranges, tithi, then weekly — the rarer the occasion,
  // the more it deserves top billing in the banner.
  const rank = { festival: 0, range: 1, tithi: 2, weekday: 3 } as const;
  return out.sort((a, b) => rank[a.reason] - rank[b.reason]);
}

// A deity's weekly dedication (e.g. Tuesday → Hanuman) plus the next calendar
// date it falls on. These are the weekday-only rules that `lib/upcoming.ts`
// deliberately skips — a weekly habit isn't an "event", but it IS the single
// most actionable thing on a deity's page, so it gets its own surface.

export interface WeeklyDedication {
  weekday: number; // 0=Sun .. 6=Sat
  labelEn: string;
  labelHi: string;
  note?: string;
  noteHi?: string;
  nextDate: string; // YYYY-MM-DD, === today when daysAway is 0
  daysAway: number; // 0 = today, 1 = tomorrow, … 6
}

const DAY_MS = 86_400_000;

function addDays(dateKey: string, n: number): string {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) + n * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function weeklyDedications(
  specialDays: SpecialDayConfig[] | null | undefined,
  fromDateKey: string,
  vaarIndex: number
): WeeklyDedication[] {
  if (!Array.isArray(specialDays)) return [];
  const out: WeeklyDedication[] = [];
  const seen = new Set<number>();

  for (const d of specialDays) {
    if (!d || d.weekday === undefined) continue;
    // Only *pure* weekly rules. A weekday paired with a tithi/date is a
    // narrower occasion (handled by todaysObservances / getUpcomingEvents),
    // not a standing "this weekday belongs to this deity" dedication.
    if (d.tithi || d.startDate || d.festivalDates?.length) continue;
    if (!Number.isInteger(d.weekday) || d.weekday < 0 || d.weekday > 6) continue;
    if (seen.has(d.weekday)) continue;
    seen.add(d.weekday);

    const daysAway = (d.weekday - vaarIndex + 7) % 7;
    out.push({
      weekday: d.weekday,
      labelEn: d.labelEn,
      labelHi: d.labelHi,
      note: d.note,
      noteHi: d.noteHi,
      nextDate: addDays(fromDateKey, daysAway),
      daysAway,
    });
  }

  // Soonest first, so today's dedication (if any) leads.
  return out.sort((a, b) => a.daysAway - b.daysAway);
}
