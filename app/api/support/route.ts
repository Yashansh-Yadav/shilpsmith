import type { NextRequest } from "next/server";

import { prisma } from "../../../lib/prisma";
import { created, handle } from "../../../lib/apiResponse";
import { parseJson } from "../../../lib/middleware/validateRequest";
import { SupportConcernSchema } from "../../../lib/validators";
import { rateLimit } from "../../../lib/middleware/rateLimit";
import { notifyAdmin } from "../../../lib/notify";
import { logger } from "../../../lib/logger";

export const dynamic = "force-dynamic";

// Public "raise a concern" endpoint. Persists the request as a Lead row (no
// schema migration needed) with a structured `notes` payload, and notifies the
// business (email + WhatsApp). Notification is fire-and-forget so missing config
// never blocks the customer.
export const POST = handle(async (request: NextRequest) => {
  rateLimit(request, { windowMs: 60_000, max: 5, namespace: "support" });

  const input = await parseJson(request, SupportConcernSchema);

  await prisma.lead.create({
    data: {
      customerName: input.name,
      phone: input.phone ?? "",
      message: input.message,
      // Marker + contact details the Lead table can't hold as first-class
      // columns. The admin support inbox parses this back out.
      notes: JSON.stringify({
        type: "support",
        email: input.email,
        phone: input.phone ?? "",
        category: input.category,
        orderNumber: input.orderNumber ?? "",
      }),
      status: "new",
    },
  });

  notifyAdmin({
    type: "support",
    title: `New support request · ${input.category}`,
    lines: [
      { label: "Name", value: input.name },
      { label: "Email", value: input.email },
      { label: "Phone", value: input.phone ?? "—" },
      { label: "Category", value: input.category },
      { label: "Order #", value: input.orderNumber ?? "—" },
    ],
    body: input.message,
    path: "/admin/support",
    replyTo: input.email,
  }).catch((err) => logger.error("support notification failed", { err }));

  return created(
    { received: true },
    "Thanks! We've received your request and will get back to you soon."
  );
});
