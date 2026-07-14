import type { NextRequest } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { parseJson } from "../../../../../lib/middleware/validateRequest";
import {
  ProductUpdateSchema,
  generateSlug,
} from "../../../../../lib/validators";
import { NotFoundError, ValidationError } from "../../../../../lib/errors";
import { stripHtml } from "../../../../../lib/sanitize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function resolveId(ctx: Ctx): Promise<number> {
  const { id } = await ctx.params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError("Invalid product id");
  }
  return parsed;
}

export const GET = handle(async (_req: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: true,
      images: { orderBy: { id: "asc" } },
      variants: true,
    },
  });
  if (!product) throw new NotFoundError("Product not found");
  return ok(product);
});

export const PUT = handle(async (request: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  const input = await parseJson(request, ProductUpdateSchema);

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    data.name = input.name;
    data.slug = generateSlug(input.name);
  }
  if (input.shortDescription !== undefined) {
    data.shortDescription = input.shortDescription;
  } else if (input.description !== undefined) {
    // Keep the plain-text card summary in sync when the rich description changes.
    data.shortDescription = stripHtml(input.description).slice(0, 500);
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.price !== undefined) data.price = input.price;
  if (input.discountPrice !== undefined) {
    data.discountPrice = input.discountPrice || null;
  }
  if (input.featured !== undefined) data.featured = input.featured;
  if (input.customizable !== undefined) data.customizable = input.customizable;
  if (input.customFields !== undefined) data.customFields = input.customFields;
  if (input.stockStatus !== undefined) data.stockStatus = input.stockStatus;
  if (input.stock !== undefined) data.stock = input.stock;
  if (input.modelUrl !== undefined) data.modelUrl = input.modelUrl || null;
  if (input.deityId !== undefined) data.deityId = input.deityId ?? null;
  if (input.whatsappMessage !== undefined) data.whatsappMessage = input.whatsappMessage;

  if (input.category !== undefined) {
    const category = await prisma.category.findUnique({
      where: { slug: input.category },
      select: { id: true },
    });
    if (!category) {
      throw new ValidationError(`Category '${input.category}' does not exist`);
    }
    data.categoryId = category.id;
  }

  // Gallery replacement. The whole image set is replaced when the client sends
  // `images` (new multi-image admin form) or the legacy single `image` field.
  let newImages: string[] | undefined;
  if (input.images !== undefined) {
    newImages = input.images;
  } else if (input.image !== undefined) {
    newImages = input.image ? [input.image] : [];
  }
  if (newImages !== undefined) {
    if (newImages.length === 0) {
      throw new ValidationError("At least one product image is required");
    }
    await prisma.productImage.deleteMany({ where: { productId: id } });
    data.images = { create: newImages.map((url) => ({ url })) };
  }

  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: true, images: { orderBy: { id: "asc" } } },
  });

  return ok(product, { message: "Product updated" });
});

export const DELETE = handle(async (_req: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);

  // Soft delete so historical orders keep their product reference intact.
  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return ok({ id }, { message: "Product deleted" });
});
