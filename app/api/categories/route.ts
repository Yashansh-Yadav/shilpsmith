import { prisma } from "../../../lib/prisma";
import { ok, handle } from "../../../lib/apiResponse";

export const GET = handle(async () => {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, description: true, image: true },
    orderBy: { name: "asc" },
  });
  return ok(categories);
});
