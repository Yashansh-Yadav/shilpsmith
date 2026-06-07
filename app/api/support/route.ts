import type { NextRequest } from "next/server";

import { prisma } from "../../../lib/prisma";
import { created, handle } from "../../../lib/apiResponse";
import { parseJson } from "../../../lib/middleware/validateRequest";
import { SupportConcernSchema } from "../../../lib/validators";
import { rateLimit } from "../../../lib/middleware/rateLimit";
import { sendSupportConcernEmail } from "../../../lib/email";
import { logger } from "../../../lib/logger";

export const dynamic = "force-dynamic";

// Public "raise a concern" endpoint. Persists the request as a Lead row (no
// schema migration needed) with a structured `notes` payload, and emails the
// business. Email is fire-and-forget so a missing Resend key never blocks the
// customer.
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

  sendSupportConcernEmail({
    name: input.name,
    email: input.email,
    phone: input.phone,
    category: input.category,
    orderNumber: input.orderNumber,
    message: input.message,
  }).catch((err) => logger.error("support email failed", { err }));

  return created(
    { received: true },
    "Thanks! We've received your request and will get back to you soon."
  );
});
