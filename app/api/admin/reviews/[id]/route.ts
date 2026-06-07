import type { NextRequest } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { parseJson } from "../../../../../lib/middleware/validateRequest";
import { ReviewModerationSchema } from "../../../../../lib/validators";
import { ValidationError } from "../../../../../lib/errors";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function resolveId(ctx: Ctx): Promise<number> {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError("Invalid review id");
  }
  return n;
}

export const PUT = handle(async (request: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  const input = await parseJson(request, ReviewModerationSchema);

  const review = await prisma.review.update({
    where: { id },
    data: {
      ...(input.approved !== undefined ? { approved: input.approved } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.comment !== undefined ? { comment: input.comment } : {}),
    },
  });
  return ok(review, { message: "Review updated" });
});

export const DELETE = handle(async (_req: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  await prisma.review.delete({ where: { id } });
  return ok({ id }, { message: "Review deleted" });
});
