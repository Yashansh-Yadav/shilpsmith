import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "../../../../lib/prisma";
import { ok, created, handle } from "../../../../lib/apiResponse";
import {
  parseJson,
  parseQuery,
} from "../../../../lib/middleware/validateRequest";
import {
  AdminProductListQuerySchema,
  ProductCreateSchema,
  generateSlug,
} from "../../../../lib/validators";
import { ConflictError } from "../../../../lib/errors";

export const dynamic = "force-dynamic";

export const GET = handle(async (request: NextRequest) => {
  const q = parseQuery(request, AdminProductListQuerySchema);

  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (q.category) where.category = { slug: q.category };
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: "insensitive" } },
      { slug: { contains: q.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: true, images: true },
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return ok({
    items,
    page: q.page,
    pageSize: q.pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / q.pageSize)),
  });
});

export const POST = handle(async (request: NextRequest) => {
  const input = await parseJson(request, ProductCreateSchema);

  const slug = generateSlug(input.name);

  const category = await prisma.category.findUnique({
    where: { slug: input.category },
    select: { id: true },
  });
  if (!category) {
    throw new ConflictError(`Category '${input.category}' does not exist`);
  }

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      shortDescription: input.shortDescription || input.description,
      description: input.description,
      price: input.price,
      discountPrice: input.discountPrice ?? null,
      customizable: input.customizable,
      featured: input.featured,
      stockStatus: input.stockStatus,
      stock: input.stock,
      whatsappMessage: input.whatsappMessage,
      categoryId: category.id,
      images: { create: [{ url: input.image }] },
    },
    include: { category: true, images: true },
  });

  return created(product, "Product created");
});
