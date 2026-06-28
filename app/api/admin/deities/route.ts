import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

import { prisma } from "../../../../lib/prisma";
import { ok, created, handle } from "../../../../lib/apiResponse";
import { parseJson } from "../../../../lib/middleware/validateRequest";
import { DeityCreateSchema } from "../../../../lib/validators";
import { DEITIES_TAG, deityTag } from "../../../../lib/cache";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const deities = await prisma.deity.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return ok(deities);
});

export const POST = handle(async (request: NextRequest) => {
  const input = await parseJson(request, DeityCreateSchema);

  const deity = await prisma.deity.create({
    data: {
      key: input.key,
      active: input.active,
      nameEn: input.nameEn,
      nameHi: input.nameHi,
      mantra: input.mantra,
      transliteration: input.transliteration ?? null,
      aartis: input.aartis,
      bhajans: input.bhajans,
      scriptures: input.scriptures,
      specialDays: input.specialDays,
      sortOrder: input.sortOrder,
    },
  });

  revalidateTag(DEITIES_TAG);
  revalidateTag(deityTag(deity.key));
  return created(deity, "Deity created");
});
