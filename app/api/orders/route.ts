import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import { created, handle } from "../../../lib/apiResponse";
import { parseJson } from "../../../lib/middleware/validateRequest";
import { OrderCreateSchema, parsePrice } from "../../../lib/validators";
import { ValidationError, ConflictError } from "../../../lib/errors";
import { rateLimit } from "../../../lib/middleware/rateLimit";
import { logger } from "../../../lib/logger";
import { sendOrderConfirmationEmail } from "../../../lib/email";
import { notifyAdmin } from "../../../lib/notify";
import { notifyCustomerOrder } from "../../../lib/whatsappCustomer";
import { getOnlinePaymentsEnabled } from "../../../lib/settings";

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

// Flat shipping rule, mirrors the cart store. Kept here so the server is the
// source of truth for the price the customer is actually billed.
function computeShipping(subtotal: number): number {
  if (subtotal === 0) return 0;
  return subtotal >= 1000 ? 0 : 50;
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
      if (variant.stock > 0 && item.quantity > variant.stock) {
        throw new ConflictError(
          `Only ${variant.stock} of '${product.name} (${variant.name})' available`
        );
      }
    } else if (product.stock > 0 && item.quantity > product.stock) {
      throw new ConflictError(
        `Only ${product.stock} of '${product.name}' available`
      );
    }
  }

  // Compute totals server-side. Variant priceModifier is added to base price.
  let subtotal = 0;
  const orderItemsCreate = input.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const variant = item.variantId != null ? variantMap.get(item.variantId)! : null;

    const base = parsePrice(product.price);
    if (!Number.isFinite(base) || base <= 0) {
      throw new ConflictError(
        `'${product.name}' has an invalid price configured`
      );
    }
    const unit = base + (variant ? Number(variant.priceModifier) : 0);
    if (unit <= 0) {
      throw new ConflictError(
        `'${product.name}' (${variant?.name ?? "base"}) has a non-positive total price`
      );
    }
    const lineSubtotal = unit * item.quantity;
    subtotal += lineSubtotal;

    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: variant ? `${product.name} (${variant.name})` : product.name,
      unitPrice: new Prisma.Decimal(unit.toFixed(2)),
      quantity: item.quantity,
      subtotal: new Prisma.Decimal(lineSubtotal.toFixed(2)),
      customization: item.customization
        ? (item.customization as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };
  });

  // Optional discount code lookup (validation only; redemption side-effects
  // would also bump usedCount in a single transaction, but we keep the
  // happy path simple here).
  let discount = 0;
  let discountCodeId: number | null = null;
  if (input.discountCode) {
    const code = await prisma.discountCode.findUnique({
      where: { code: input.discountCode.toUpperCase() },
    });
    const now = new Date();
    const valid =
      code &&
      code.active &&
      (!code.startsAt || code.startsAt <= now) &&
      (!code.expiresAt || code.expiresAt > now) &&
      (!code.maxUses || code.usedCount < code.maxUses) &&
      (!code.minOrderValue || subtotal >= Number(code.minOrderValue));

    if (!valid) {
      throw new ValidationError("Discount code is not valid", [
        { field: "discountCode", message: "Invalid or expired code" },
      ]);
    }
    if (code.type === "PERCENTAGE") {
      discount = (subtotal * Number(code.value)) / 100;
    } else {
      discount = Number(code.value);
    }
    discount = Math.min(discount, subtotal);
    discountCodeId = code.id;
  }

  const shipping = computeShipping(subtotal);
  const tax = 0;
  const total = Math.max(0, subtotal + shipping + tax - discount);

  const orderNumber = generateOrderNumber();

  const result = await prisma.$transaction(
    async (tx) => {
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
      total: Number(result.total),
      paymentMethod: result.paymentMethod,
      paymentStatus: result.paymentStatus,
      status: result.status,
    },
    "Order created"
  );
});
