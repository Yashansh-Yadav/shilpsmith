import type { NextRequest } from "next/server";

import { prisma } from "../../../../lib/prisma";
import { ok, created, handle } from "../../../../lib/apiResponse";
import { parseJson } from "../../../../lib/middleware/validateRequest";
import {
  CategoryCreateSchema,
  generateSlug,
} from "../../../../lib/validators";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "desc" },
  });
  return ok(categories);
});

export const POST = handle(async (request: NextRequest) => {
  const input = await parseJson(request, CategoryCreateSchema);

  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug: generateSlug(input.name),
      description: input.description,
      image: input.image,
    },
  });

  return created(category, "Category created");
});
