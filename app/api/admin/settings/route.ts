import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";
import { parseJson } from "../../../../lib/middleware/validateRequest";
import { SettingsUpsertSchema } from "../../../../lib/validators";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const rows = await prisma.settings.findMany({ orderBy: { key: "asc" } });
  return ok(rows);
});

export const PUT = handle(async (request: NextRequest) => {
  const input = await parseJson(request, SettingsUpsertSchema);

  const row = await prisma.settings.upsert({
    where: { key: input.key },
    update: { value: input.value as Prisma.InputJsonValue },
    create: { key: input.key, value: input.value as Prisma.InputJsonValue },
  });
  return ok(row, { message: "Setting saved" });
});
