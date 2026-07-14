// Shared Next.js cache-tag conventions. Public reads (e.g. the /darshan pages)
// wrap their data in `unstable_cache` tagged with these; admin writes call
// `revalidateTag` with the same strings so edits surface immediately instead of
// waiting for a time-based revalidate.

// Tag for any list/landing that enumerates deities (admin list, /smart-idols).
export const DEITIES_TAG = "deities";

// Per-deity tag for a single /darshan/<key> page.
export function deityTag(key: string): string {
  return `deity:${key}`;
}
