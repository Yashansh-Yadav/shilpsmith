import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import type { Aarti, Bhajan, Scripture } from "../../../../../lib/validators";

export const dynamic = "force-dynamic";

// Link health check for deity media. Flags YouTube embeds that are missing /
// non-embeddable (incl. the seed placeholder id) and scripture PDF URLs that
// don't resolve — so struck/removed content (or unreplaced placeholders) never
// silently sits live on a /darshan page. Run from the admin Deities screen.

const TIMEOUT_MS = 6000;

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await p(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

// A video is considered healthy if YouTube's oEmbed returns 200 (exists +
// embeddable). 401/404 → unavailable or embedding disabled.
async function checkYouTube(id: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return "invalid id format";
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
  try {
    const res = await withTimeout((signal) => fetch(url, { signal }));
    if (res.ok) return null;
    return `youtube ${res.status} (unavailable or embedding disabled)`;
  } catch {
    return "youtube request failed";
  }
}

async function checkUrl(url: string): Promise<string | null> {
  try {
    // HEAD first; some hosts reject HEAD, so fall back to a ranged GET.
    let res = await withTimeout((signal) =>
      fetch(url, { method: "HEAD", signal, redirect: "follow" })
    );
    if (res.status === 405 || res.status === 501) {
      res = await withTimeout((signal) =>
        fetch(url, {
          method: "GET",
          signal,
          redirect: "follow",
          headers: { Range: "bytes=0-0" },
        })
      );
    }
    if (res.ok || res.status === 206) return null;
    return `http ${res.status}`;
  } catch {
    return "request failed";
  }
}

interface Issue {
  kind: "aarti" | "bhajan" | "scripture";
  label: string;
  target: string;
  problem: string;
}

export const GET = handle(async () => {
  const deities = await prisma.deity.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    select: {
      id: true,
      key: true,
      nameEn: true,
      aartis: true,
      bhajans: true,
      scriptures: true,
    },
  });

  const report = await Promise.all(
    deities.map(async (d) => {
      const aartis = (d.aartis as Aarti[]) ?? [];
      const bhajans = (d.bhajans as Bhajan[]) ?? [];
      const scriptures = (d.scriptures as Scripture[]) ?? [];

      const checks = await Promise.all<Issue | null>([
        ...aartis.map(async (a) => {
          const problem = await checkYouTube(a.youtubeId);
          return problem
            ? ({ kind: "aarti", label: a.labelEn, target: a.youtubeId, problem } as Issue)
            : null;
        }),
        ...bhajans.map(async (b) => {
          const problem = await checkYouTube(b.youtubeId);
          return problem
            ? ({ kind: "bhajan", label: b.labelEn, target: b.youtubeId, problem } as Issue)
            : null;
        }),
        ...scriptures.map(async (s) => {
          const problem = await checkUrl(s.pdfUrl);
          return problem
            ? ({ kind: "scripture", label: s.titleEn, target: s.pdfUrl, problem } as Issue)
            : null;
        }),
      ]);

      const issues = checks.filter((x): x is Issue => x !== null);
      return {
        id: d.id,
        key: d.key,
        nameEn: d.nameEn,
        checked: aartis.length + bhajans.length + scriptures.length,
        issues,
      };
    })
  );

  const totalIssues = report.reduce((n, d) => n + d.issues.length, 0);
  return ok({ totalIssues, deities: report });
});
