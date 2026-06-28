import type { Panchang } from "./panchang";
import { normalizeTithi } from "./panchang";

// Resolves which of a deity's admin-configured special days apply *today*, given
// the computed Panchang. Three independent trigger types (see SpecialDaySchema):
//   - weekday:       e.g. Monday → Shiva   (always works, no astro needed)
//   - tithi:         e.g. "Chaturdashi"    (matched against the day's tithi)
//   - festivalDates: e.g. "2026-02-15"     (curated lunar dates, exact match)
// A single special day may carry more than one trigger; any match counts.

export interface SpecialDayConfig {
  labelEn: string;
  labelHi: string;
  weekday?: number;
  tithi?: string;
  festivalDates?: string[];
  note?: string;
}

export interface Observance {
  labelEn: string;
  labelHi: string;
  note?: string;
  reason: "weekday" | "tithi" | "festival";
}

function tithiMatches(configTithi: string, panchang: Panchang): boolean {
  if (!panchang.tithiKey) return false; // panchang fell back to weekday-only
  const a = normalizeTithi(configTithi);
  if (!a) return false;
  const b = panchang.tithiKey;
  // Tolerant compare — admin "Chaturdashi" vs mhah "Chaturdasi", etc.
  return a === b || a.startsWith(b) || b.startsWith(a);
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
    if (d.weekday !== undefined && d.weekday === panchang.vaarIndex) {
      reason = "weekday";
    } else if (d.tithi && tithiMatches(d.tithi, panchang)) {
      reason = "tithi";
    } else if (
      Array.isArray(d.festivalDates) &&
      d.festivalDates.includes(panchang.date)
    ) {
      reason = "festival";
    }

    if (reason) {
      out.push({
        labelEn: d.labelEn,
        labelHi: d.labelHi,
        note: d.note,
        reason,
      });
    }
  }

  // Festivals first, then tithi, then weekly — the rarer the occasion, the more
  // it deserves top billing in the banner.
  const rank = { festival: 0, tithi: 1, weekday: 2 } as const;
  return out.sort((a, b) => rank[a.reason] - rank[b.reason]);
}
