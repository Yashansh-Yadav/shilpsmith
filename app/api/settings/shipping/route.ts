import { ok, handle } from "../../../../lib/apiResponse";
import { getShippingConfig } from "../../../../lib/settings";

export const dynamic = "force-dynamic";

// Public read of the shipping rule so the cart/checkout can show the same
// charge the order route will bill. Exposes only the flat rate + free-shipping
// threshold — no sensitive data — so it lives outside /api/admin.
export const GET = handle(async () => {
  const config = await getShippingConfig();
  return ok(config);
});