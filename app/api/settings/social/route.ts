import { ok, handle } from "../../../../lib/apiResponse";
import { getSocialLinks } from "../../../../lib/settings";

export const dynamic = "force-dynamic";

// Public read of the business social profiles, for the footer. Intentionally
// outside /api/admin (no auth) — these URLs are published on every page anyway.
export const GET = handle(async () => {
  const links = await getSocialLinks();
  return ok(links);
});
