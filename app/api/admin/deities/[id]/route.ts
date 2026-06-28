import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { parseJson } from "../../../../../lib/middleware/validateRequest";
import { DeityUpdateSchema } from "../../../../../lib/validators";
import { NotFoundError, ValidationError } from "../../../../../lib/errors";
import { DEITIES_TAG, deityTag } from "../../../../../lib/cache";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function resolveId(ctx: Ctx): Promise<number> {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError("Invalid deity id");
  }
  return n;
}

export const GET = handle(async (_req: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  const deity = await prisma.deity.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!deity) throw new NotFoundError("Deity not found");
  return ok(deity);
});

export const PUT = handle(async (request: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  const input = await parseJson(request, DeityUpdateSchema);

  // Fetch the current key so we can revalidate the old slug too if it changes.
  const existing = await prisma.deity.findUnique({
    where: { id },
    select: { key: true },
  });
  if (!existing) throw new NotFoundError("Deity not found");

  // Only assign provided fields — the update schema is defaults-free so a
  // partial PUT never wipes the JSON arrays back to [].
  const data: Prisma.DeityUpdateInput = {};
  if (input.key !== undefined) data.key = input.key;
  if (input.active !== undefined) data.active = input.active;
  if (input.nameEn !== undefined) data.nameEn = input.nameEn;
  if (input.nameHi !== undefined) data.nameHi = input.nameHi;
  if (input.mantra !== undefined) data.mantra = input.mantra;
  if (input.transliteration !== undefined) {
    data.transliteration = input.transliteration ?? null;
  }
  if (input.aartis !== undefined) data.aartis = input.aartis;
  if (input.bhajans !== undefined) data.bhajans = input.bhajans;
  if (input.scriptures !== undefined) data.scriptures = input.scriptures;
  if (input.specialDays !== undefined) data.specialDays = input.specialDays;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  const deity = await prisma.deity.update({ where: { id }, data });

  revalidateTag(DEITIES_TAG);
  revalidateTag(deityTag(existing.key));
  if (deity.key !== existing.key) revalidateTag(deityTag(deity.key));

  return ok(deity, { message: "Deity updated" });
});

export const DELETE = handle(async (_req: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);

  const deity = await prisma.deity.findUnique({
    where: { id },
    select: { key: true, _count: { select: { products: true } } },
  });
  if (!deity) throw new NotFoundError("Deity not found");

  // Deities linked to products aren't hard-deleted — products keep their NFC
  // tag working. We soft-disable instead (active:false hides /darshan/<key>),
  // mirroring the discount-code soft-delete pattern.
  const refs = deity._count.products;
  if (refs > 0) {
    const updated = await prisma.deity.update({
      where: { id },
      data: { active: false },
    });
    revalidateTag(DEITIES_TAG);
    revalidateTag(deityTag(updated.key));
    return ok(updated, {
      message: `Deity linked to ${refs} product(s); disabled instead of deleted`,
    });
  }

  await prisma.deity.delete({ where: { id } });
  revalidateTag(DEITIES_TAG);
  revalidateTag(deityTag(deity.key));
  return ok({ id }, { message: "Deity deleted" });
});
