"use client";

import type { CartItem, PricingBreakdown } from "../../lib/store/cart";
import type { AddressFormValues } from "./AddressForm";

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

interface Props {
  items: CartItem[];
  pricing: PricingBreakdown;
  /** Name of the applied discount, shown on the discount line when present. */
  discountLabel?: string | null;
  shippingAddress: AddressFormValues;
  paymentMethod: "RAZORPAY" | "WHATSAPP" | "COD";
}

export default function OrderReview({
  items,
  pricing,
  discountLabel,
  shippingAddress,
  paymentMethod,
}: Props) {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-slate-50 p-5">
        <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
          Items
        </h3>
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={`${item.productId}::${item.variantId ?? "_"}`}
              className="flex items-start justify-between gap-3"
            >
              <div>
                <p className="font-display font-semibold tracking-tight text-slate-900">
                  {item.name}
                  {item.variantName && (
                    <span className="ml-1 font-sans text-sm font-normal text-slate-500">
                      · {item.variantName}
                    </span>
                  )}{" "}
                  <span className="font-mono text-sm font-normal text-slate-500">
                    × {item.quantity}
                  </span>
                </p>
                {item.customization &&
                  Object.keys(item.customization).length > 0 && (
                    <dl className="text-xs text-slate-500">
                      {Object.entries(item.customization).map(([k, v]) => (
                        <div key={k}>
                          <dt className="inline font-medium">{k}:</dt>{" "}
                          <dd className="inline">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
              </div>
              <p className="font-mono font-semibold text-slate-900">
                {formatRupee(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[1.5rem] bg-slate-50 p-5">
        <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
          Ship to
        </h3>
        <address className="not-italic text-[15px] leading-7 text-slate-700">
          {shippingAddress.fullName}
          <br />
          {shippingAddress.street}
          <br />
          {shippingAddress.city}, {shippingAddress.state}{" "}
          {shippingAddress.postalCode}
          <br />
          {shippingAddress.country}
          <br />
          {shippingAddress.phone}
          {shippingAddress.email ? ` · ${shippingAddress.email}` : ""}
        </address>
      </section>

      <section className="rounded-[1.5rem] bg-slate-50 p-5">
        <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
          Payment
        </h3>
        <p className="text-[15px] font-medium text-slate-800">
          {paymentMethod === "RAZORPAY" && "Online payment (Razorpay)"}
          {paymentMethod === "WHATSAPP" && "Confirm via WhatsApp"}
          {paymentMethod === "COD" && "Cash on Delivery"}
        </p>
      </section>

      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
        <dl className="space-y-2 text-[15px]">
          <Row label="Subtotal" value={formatRupee(pricing.subtotal)} />
          <Row
            label="Shipping"
            value={
              pricing.shipping === 0 ? "Free" : formatRupee(pricing.shipping)
            }
          />
          <Row label="Tax (GST)" value={formatRupee(pricing.tax)} />
          {pricing.discount > 0 && (
            <Row
              label={discountLabel ? `Discount · ${discountLabel}` : "Discount"}
              value={`− ${formatRupee(pricing.discount)}`}
            />
          )}
          <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
            <dt className="font-display text-lg font-semibold">Total</dt>
            <dd className="font-mono text-2xl font-bold">{formatRupee(pricing.total)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono font-medium">{value}</dd>
    </div>
  );
}
