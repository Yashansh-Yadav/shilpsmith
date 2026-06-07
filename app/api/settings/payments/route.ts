import { ok, handle } from "../../../../lib/apiResponse";
import { getOnlinePaymentsEnabled } from "../../../../lib/settings";

export const dynamic = "force-dynamic";

// Public read of the payments toggle so the checkout can decide whether to offer
// the online (Razorpay) option. Intentionally outside /api/admin (no auth) —
// it exposes only a single boolean.
export const GET = handle(async () => {
  const onlineEnabled = await getOnlinePaymentsEnabled();
  return ok({ onlineEnabled });
});
