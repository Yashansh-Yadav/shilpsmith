import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import { created, handle } from "../../../lib/apiResponse";
import { parseJson } from "../../../lib/middleware/validateRequest";
import { OrderCreateSchema } from "../../../lib/validators";
import { ValidationError, ConflictError } from "../../../lib/errors";
import { rateLimit } from "../../../lib/middleware/rateLimit";
import { logger } from "../../../lib/logger";
import { sendOrderConfirmationEmail } from "../../../lib/email";
import { notifyAdmin } from "../../../lib/notify";
import { notifyCustomerOrder } from "../../../lib/whatsappCustomer";
import { getOnlinePaymentsEnabled, getShippingConfig } from "../../../lib/settings";
import { computeShipping } from "../../../lib/shipping";
import { effectivePrice, resolveBestDiscount, rejectionMessage } from "../../../lib/discounts";
import { loadDiscountCandidates } from "../../../lib/discountQuery";

export const dynamic = "force-dynamic";

// Generate ORD-YYYYMMDD-XXXXX. We add a 5-digit random suffix; the unique
// constraint on Order.orderNumber catches the rare collision and `handle()`
// turns that into a 409 — clients can simply retry.
function generateOrderNumber(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}${String(d.getUTCDate()).padStart(2, "0")}`;
  const suffix = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${ymd}-${suffix}`;
}

export const POST = handle(async (request: NextRequest) => {
  rateLimit(request, { windowMs: 60_000, max: 10, namespace: "orders" });

  const input = await parseJson(request, OrderCreateSchema);

  // Block online payments unless an admin has enabled them (Settings → Payments).
  // The checkout already hides the option, but enforce it here so the route can't
  // be bypassed.
  if (input.paymentMethod === "RAZORPAY" && !(await getOnlinePaymentsEnabled())) {
    throw new ValidationError(
      "Online payments are currently unavailable. Please choose WhatsApp or Cash on delivery."
    );
  }

  // Re-validate against the live catalog. Never trust client-supplied prices.
  const productIds = Array.from(new Set(input.items.map((i) => i.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: {
      id: true,
      name: true,
      price: true,
      discountPrice: true,
      categoryId: true,
      stockStatus: true,
      stock: true,
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Pull every variant the cart references in one query.
  const variantIds = Array.from(
    new Set(
      input.items
        .map((i) => i.variantId)
        .filter((v): v is number => typeof v === "number")
    )
  );
  const variants = variantIds.length
    ? await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true,
          productId: true,
          name: true,
          stock: true,
          priceModifier: true,
        },
      })
    : [];
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new ValidationError(
        `Product ${item.productId} is no longer available`,
        [{ field: "items", message: `Product ${item.productId} not found` }]
      );
    }
    if (product.stockStatus === "out-of-stock") {
      throw new ConflictError(`'${product.name}' is out of stock`);
    }

    if (item.variantId != null) {
      const variant = variantMap.get(item.variantId);
      if (!variant || variant.productId !== product.id) {
        throw new ValidationError(
          `Variant ${item.variantId} is no longer available`,
          [
            {
              field: "items",
              message: `Variant ${item.variantId} not found for product ${product.id}`,
            },
          ]
        );
      }
      // stock is authoritative: 0 means none left, not "untracked".
      if (variant.stock <= 0) {
        throw new ConflictError(
          `'${product.name} (${variant.name})' is out of stock`
        );
      }
      if (item.quantity > variant.stock) {
        throw new ConflictError(
          `Only ${variant.stock} of '${product.name} (${variant.name})' available`
        );
      }
    } else {
      if (product.stock <= 0) {
        throw new ConflictError(`'${product.name}' is out of stock`);
      }
      if (item.quantity > product.stock) {
        throw new ConflictError(
          `Only ${product.stock} of '${product.name}' available`
        );
      }
    }
  }

  // Compute totals server-side. `effectivePrice` applies the product's own sale
  // price (discountPrice); variant priceModifier is added on top. Never trust a
  // client-sent price — everything here comes from productMap/variantMap.
  let subtotal = 0;
  const discountLines: {
    productId: number;
    categoryId: number | null;
    unitPrice: number;
    quantity: number;
  }[] = [];

  const orderItemsCreate = input.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const variant = item.variantId != null ? variantMap.get(item.variantId)! : null;
    const modifier = variant ? Number(variant.priceModifier) : 0;

    const base = effectivePrice(product);
    if (!Number.isFinite(base) || base <= 0) {
      throw new ConflictError(
        `'${product.name}' has an invalid price configured`
      );
    }
    const listUnit = listBase + modifier;
    const saleUnit = effectivePrice(product) + modifier; // sale price, or list if none
    if (listUnit <= 0) {
      throw new ConflictError(
        `'${product.name}' (${variant?.name ?? "base"}) has a non-positive total price`
      );
    }
    return { item, product, variant, listUnit, saleUnit };
  });

    discountLines.push({
      productId: product.id,
      categoryId: product.categoryId,
      unitPrice: unit,
      quantity: item.quantity,
    });

    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: variant ? `${product.name} (${variant.name})` : product.name,
      unitPrice: new Prisma.Decimal(unit.toFixed(2)),
      quantity: item.quantity,
      subtotal: new Prisma.Decimal((unit * item.quantity).toFixed(2)),
      customization: item.customization
        ? (item.customization as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };
  });

<<<<<<< HEAD
  // Resolve the single best discount — automatic event discounts plus, if the
  // customer typed one, their code. They don't stack; the biggest saving wins.
  // This is the authoritative computation: the client previews the same numbers
  // but the order is priced from here.
  const candidates = await loadDiscountCandidates(
    prisma,
    input.discountCode ?? null
  );
  const resolution = resolveBestDiscount(candidates, discountLines, {
    typedCode: input.discountCode ?? null,
  });

  // If the customer typed a code and it was refused outright, tell them why
  // rather than silently dropping it — they expected it to work.
  if (resolution.codeRejection) {
    const rule = candidates.find(
      (c) => c.code?.toUpperCase() === input.discountCode?.trim().toUpperCase()
    );
    throw new ValidationError("Discount code is not valid", [
      {
        field: "discountCode",
        message: rejectionMessage(
          resolution.codeRejection,
          rule?.minOrderValue ?? null
        ),
      },
    ]);
  }

  const discount = resolution.best?.amount ?? 0;
  const discountCodeId = resolution.best?.id ?? null;

=======
>>>>>>> 834743cf2044314ba2a270e448fcd08275b69741
  // Shipping from admin Settings (not a hardcoded rule) — authoritative here.
  const shipping = computeShipping(subtotal, await getShippingConfig());
  const tax = 0;
  const total = Math.max(0, subtotal + shipping + tax - discount);

  const orderNumber = generateOrderNumber();

  // Sum quantities per product/variant — the same product can appear in the cart
  // more than once (different variant or customization), and each line must
  // count against the same shelf.
  const productQty = new Map<number, number>();
  const variantQty = new Map<number, number>();
  for (const item of input.items) {
    if (item.variantId != null) {
      variantQty.set(
        item.variantId,
        (variantQty.get(item.variantId) ?? 0) + item.quantity
      );
    } else {
      productQty.set(
        item.productId,
        (productQty.get(item.productId) ?? 0) + item.quantity
      );
    }
  }

  const result = await prisma.$transaction(
    async (tx) => {
    // Claim stock first, conditionally. The pre-flight checks above give nice
    // error messages but can't prevent two shoppers passing them at the same
    // instant — `updateMany` with a `gte` guard is what actually closes the
    // race, because the DB evaluates the condition and the write atomically.
    // count === 0 means someone else took the last unit in between.
    for (const [productId, qty] of productQty) {
      const claimed = await tx.product.updateMany({
        where: { id: productId, deletedAt: null, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (claimed.count === 0) {
        const name = productMap.get(productId)?.name ?? `Product ${productId}`;
        throw new ConflictError(
          `'${name}' just sold out — please adjust the quantity and try again`
        );
      }
    }

    for (const [variantId, qty] of variantQty) {
      const claimed = await tx.productVariant.updateMany({
        where: { id: variantId, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (claimed.count === 0) {
        const v = variantMap.get(variantId);
        const name = v
          ? `${productMap.get(v.productId)?.name ?? "Item"} (${v.name})`
          : `Variant ${variantId}`;
        throw new ConflictError(
          `'${name}' just sold out — please adjust the quantity and try again`
        );
      }
    }

    const shippingAddress = await tx.address.create({
      data: {
        fullName: input.shippingAddress.fullName,
        phone: input.shippingAddress.phone,
        email: input.shippingAddress.email ?? input.customerEmail,
        street: input.shippingAddress.street,
        city: input.shippingAddress.city,
        state: input.shippingAddress.state,
        postalCode: input.shippingAddress.postalCode,
        country: input.shippingAddress.country,
      },
    });

    const billingAddress = input.billingAddress
      ? await tx.address.create({
          data: {
            fullName: input.billingAddress.fullName,
            phone: input.billingAddress.phone,
            email: input.billingAddress.email ?? input.customerEmail,
            street: input.billingAddress.street,
            city: input.billingAddress.city,
            state: input.billingAddress.state,
            postalCode: input.billingAddress.postalCode,
            country: input.billingAddress.country,
          },
        })
      : null;

    const order = await tx.order.create({
      data: {
        orderNumber,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        shippingAddressId: shippingAddress.id,
        billingAddressId: billingAddress ? billingAddress.id : shippingAddress.id,
        subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
        tax: new Prisma.Decimal(tax.toFixed(2)),
        shipping: new Prisma.Decimal(shipping.toFixed(2)),
        discount: new Prisma.Decimal(discount.toFixed(2)),
        total: new Prisma.Decimal(total.toFixed(2)),
        discountCodeId,
        paymentMethod: input.paymentMethod,
        // Online payments stay pending until verify; offline methods are also
        // pending until admin confirms.
        status: "PENDING",
        paymentStatus: "PENDING",
        notes: input.notes,
        items: { create: orderItemsCreate },
      },
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
      },
    });

    if (discountCodeId) {
      await tx.discountCode.update({
        where: { id: discountCodeId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return order;
    },
    // Neon over the pooler has high per-roundtrip latency; this transaction
    // does address + order + items + (optional) discount update, so the 5s
    // default can time out.
    { timeout: 20_000, maxWait: 5_000 }
  );

  // Best-effort customer confirmation email; never fail the order on email errors.
  sendOrderConfirmationEmail(result).catch((error) => {
    logger.error("Order confirmation email failed", {
      error,
      orderNumber: result.orderNumber,
    });
  });

  // Best-effort admin notification (email + WhatsApp).
  notifyAdmin({
    type: "order",
    title: `New order ${result.orderNumber}`,
    lines: [
      { label: "Customer", value: result.customerName },
      { label: "Total", value: `₹${Number(result.total).toLocaleString("en-IN")}` },
      { label: "Items", value: String(result.items.length) },
      { label: "Payment", value: result.paymentMethod },
    ],
    path: `/admin/orders/${result.id}`,
  }).catch((error) =>
    logger.error("Order admin notification failed", {
      error,
      orderNumber: result.orderNumber,
    })
  );

  // Best-effort customer WhatsApp ("order received"); never fail the order.
  notifyCustomerOrder(result, result.status).catch((error) =>
    logger.error("Order customer WhatsApp failed", {
      error,
      orderNumber: result.orderNumber,
    })
  );

  return created(
    {
      id: result.id,
      orderNumber: result.orderNumber,
      // The client needs this to build the confirmation link — it's the only
      // thing that authorises viewing the order. Safe to hand to the buyer who
      // just created it; never expose it on any listing endpoint.
      guestToken: result.guestToken,
      total: Number(result.total),
      paymentMethod: result.paymentMethod,
      paymentStatus: result.paymentStatus,
      status: result.status,
    },
    "Order created"
  );
});
