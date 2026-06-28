import { unstable_cache } from "next/cache";

import { prisma } from "./prisma";
import { DEITIES_TAG, deityTag } from "./cache";
import type { Aarti, Bhajan, Scripture } from "./validators";
import type { SpecialDayConfig } from "./observance";

// Server-side data access for the public Darshan pages. Reads are wrapped in
// `unstable_cache` tagged so the admin write routes' `revalidateTag` calls bust
// them immediately (see lib/cache.ts) — otherwise a 5-minute backstop applies.

export interface DeityRecord {
  id: number;
  key: string;
  active: boolean;
  nameEn: string;
  nameHi: string;
  mantra: string;
  transliteration: string | null;
  aartis: Aarti[];
  bhajans: Bhajan[];
  scriptures: Scripture[];
  specialDays: SpecialDayConfig[];
}

function shape(d: {
  id: number;
  key: string;
  active: boolean;
  nameEn: string;
  nameHi: string;
  mantra: string;
  transliteration: string | null;
  aartis: unknown;
  bhajans: unknown;
  scriptures: unknown;
  specialDays: unknown;
}): DeityRecord {
  return {
    id: d.id,
    key: d.key,
    active: d.active,
    nameEn: d.nameEn,
    nameHi: d.nameHi,
    mantra: d.mantra,
    transliteration: d.transliteration,
    aartis: (d.aartis as Aarti[]) ?? [],
    bhajans: (d.bhajans as Bhajan[]) ?? [],
    scriptures: (d.scriptures as Scripture[]) ?? [],
    specialDays: (d.specialDays as SpecialDayConfig[]) ?? [],
  };
}

// Active deity by NFC slug, or null. Cached per key + tagged for targeted
// invalidation on admin edits.
export async function getActiveDeity(key: string): Promise<DeityRecord | null> {
  return unstable_cache(
    async (k: string): Promise<DeityRecord | null> => {
      const d = await prisma.deity.findUnique({ where: { key: k } });
      if (!d || !d.active) return null;
      return shape(d);
    },
    ["deity", key],
    { tags: [DEITIES_TAG, deityTag(key)], revalidate: 300 }
  )(key);
}
