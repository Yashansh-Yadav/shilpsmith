import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../lib/prisma";
import { ok, created, handle } from "../../../../lib/apiResponse";
import { parseJson } from "../../../../lib/middleware/validateRequest";
import { DiscountCodeSchema } from "../../../../lib/validators";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  return ok(codes);
});

export const POST = handle(async (request: NextRequest) => {
  const input = await parseJson(request, DiscountCodeSchema);

  const code = await prisma.discountCode.create({
    data: {
      code: input.code,
      description: input.description,
      type: input.type,
      value: new Prisma.Decimal(input.value.toFixed(2)),
      minOrderValue:
        input.minOrderValue !== undefined
          ? new Prisma.Decimal(input.minOrderValue.toFixed(2))
          : null,
      maxUses: input.maxUses ?? null,
      perUserLimit: input.perUserLimit ?? null,
      startsAt: input.startsAt ?? null,
      expiresAt: input.expiresAt ?? null,
      active: input.active,
    },
  });
  return created(code, "Discount code created");
});
