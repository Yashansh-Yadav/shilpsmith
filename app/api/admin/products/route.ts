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
import { ConflictError, ValidationError } from "../../../../lib/errors";
import { stripHtml } from "../../../../lib/sanitize";

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
      include: { category: true, images: { orderBy: { id: "asc" } } },
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

  // Accept either the new `images` array or the legacy single `image` field.
  const imageUrls =
    input.images && input.images.length > 0
      ? input.images
      : input.image
        ? [input.image]
        : [];
  if (imageUrls.length === 0) {
    throw new ValidationError("At least one product image is required");
  }

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      // shortDescription drives product cards / meta, so keep it plain text —
      // derive it from the (now HTML) description when not supplied.
      shortDescription:
        input.shortDescription || stripHtml(input.description).slice(0, 500),
      description: input.description,
      price: input.price,
      discountPrice: input.discountPrice ?? null,
      customizable: input.customizable,
      featured: input.featured,
      stockStatus: input.stockStatus,
      stock: input.stock,
      modelUrl: input.modelUrl ?? null,
      whatsappMessage: input.whatsappMessage,
      categoryId: category.id,
      images: { create: imageUrls.map((url) => ({ url })) },
    },
    include: { category: true, images: { orderBy: { id: "asc" } } },
  });

  return created(product, "Product created");
});
