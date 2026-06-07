import type { NextRequest } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { parseJson } from "../../../../../lib/middleware/validateRequest";
import { SupportStatusUpdateSchema } from "../../../../../lib/validators";
import { ValidationError } from "../../../../../lib/errors";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function resolveId(ctx: Ctx): Promise<number> {
  const { id } = await ctx.params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError("Invalid id");
  }
  return parsed;
}

export const PUT = handle(async (request: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  const input = await parseJson(request, SupportStatusUpdateSchema);
  const row = await prisma.lead.update({
    where: { id },
    data: { status: input.status },
  });
  return ok({ id: row.id, status: row.status }, { message: "Status updated" });
});

export const DELETE = handle(async (_req: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  await prisma.lead.delete({ where: { id } });
  return ok({ id }, { message: "Request deleted" });
});
