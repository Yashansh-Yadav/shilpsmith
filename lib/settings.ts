import { prisma } from "./prisma";

// Coerce the various truthy shapes the admin UI / JSON column can store
// (boolean true, "true", "1", "on") into a real boolean.
function toBool(v: unknown): boolean {
  return v === true || v === "true" || v === "1" || v === "on";
}

/**
 * Whether online (Razorpay) payments are enabled. Backed by the `payments`
 * Settings row, toggled from the admin Settings page. Defaults to **false** —
 * online payments stay off until an admin explicitly turns them on.
 */
export async function getOnlinePaymentsEnabled(): Promise<boolean> {
  try {
    const row = await prisma.settings.findUnique({ where: { key: "payments" } });
    const value = row?.value as Record<string, unknown> | null | undefined;
    return toBool(value?.onlineEnabled);
  } catch {
    // Missing table / row / DB hiccup — fail closed (off).
    return false;
  }
}
