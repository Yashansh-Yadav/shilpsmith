import { ok, handle } from "../../../lib/apiResponse";
import { getStorefrontData } from "../../../lib/storefront";

export const dynamic = "force-dynamic";
// Cheap edge cache so repeat hits don't re-query Postgres. Revalidate every
// minute — admin edits show up quickly enough.
export const revalidate = 60;

// The homepage no longer calls this on mount — it awaits getStorefrontData()
// directly on the server so the catalog lands in the initial HTML. This route
// stays for client-side refreshes and any external consumer, and shares the
// exact same loader so the two can't drift.
export const GET = handle(async () => ok(await getStorefrontData()));
