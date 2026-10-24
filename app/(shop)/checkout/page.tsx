"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useCartStore, computePricing } from "../../../lib/store/cart";
import { useShippingConfig } from "../../../lib/useShippingConfig";
import AddressForm, {
  EMPTY_ADDRESS,
  type AddressFormValues,
} from "../../../components/shop/AddressForm";
import OrderReview from "../../../components/shop/OrderReview";
import PaymentCheckout from "../../../components/shop/PaymentCheckout";
import ProductImage from "../../../components/shop/ProductImage";

type Step = "address" | "payment" | "review";
type PaymentMethod = "RAZORPAY" | "COD";

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

interface CreatedOrder {
  id: number;
  orderNumber: string;
  guestToken: string;
  total: number;
  paymentMethod: PaymentMethod;
}

// The confirmation page is only reachable with the token — the id alone is
// sequential and guards nothing. Build the link in one place so a caller can't
// forget it and quietly produce a dead link.
function orderUrl(order: CreatedOrder): string {
  return `/order/${order.id}?t=${encodeURIComponent(order.guestToken)}`;
}

const STEPS: { id: Step; label: string }[] = [
  { id: "address", label: "Shipping" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  const [step, setStep] = useState<Step>("address");
  const [shippingAddress, setShippingAddress] =
    useState<AddressFormValues>(EMPTY_ADDRESS);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] =
    useState<AddressFormValues>(EMPTY_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof AddressFormValues, string>>
  >({});
  const [discountCode, setDiscountCode] = useState("");
  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState(false);

  // Live discount preview from the server (authoritative pricing lives in
  // /api/orders; this just shows the customer the same number in advance).
  const [discountInfo, setDiscountInfo] = useState<{
    amount: number;
    name: string;
    code: string | null;
    automatic: boolean;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountBeaten, setDiscountBeaten] = useState(false);

  // Re-price whenever the cart or typed code changes. Debounced so typing a
  // code doesn't fire a request per keystroke. Runs even with no code so an
  // automatic event discount shows up on its own.
  useEffect(() => {
    if (items.length === 0) {
      setDiscountInfo(null);
      setDiscountError(null);
      setDiscountBeaten(false);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      fetch("/api/discounts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            ...(i.variantId ? { variantId: i.variantId } : {}),
            quantity: i.quantity,
          })),
          code: discountCode.trim() || null,
        }),
      })
        .then((r) => r.json())
        .then((body) => {
          if (cancelled || !body?.success) return;
          setDiscountInfo(body.data.discount);
          setDiscountError(body.data.codeError);
          setDiscountBeaten(body.data.codeBeaten);
        })
        .catch(() => {
          /* preview is best-effort; the order route still enforces */
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [items, discountCode]);

  const shippingConfig = useShippingConfig();
  const pricingWithDiscount = useMemo(
    () => computePricing(items, discountInfo?.amount ?? 0, shippingConfig),
    [items, discountInfo, shippingConfig]
  );

  // Online (Razorpay) payments are admin-gated. Read the public flag and, if
  // it's off, make sure we never sit on a Razorpay selection.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/payments")
      .then((r) => r.json())
      .then((body) => {
        if (cancelled || !body?.success) return;
        const enabled = !!body.data.onlineEnabled;
        setOnlinePaymentsEnabled(enabled);
        if (!enabled) {
          setPaymentMethod((m) => (m === "RAZORPAY" ? "COD" : m));
        }
      })
      .catch(() => {
        /* default stays disabled */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0 && !createdOrder) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 lg:py-28">
        <h1 className="font-display text-5xl font-semibold tracking-[-0.035em] text-slate-900">
          Your bag is empty
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-slate-600">
          Add items to your bag before checking out.
        </p>
        <Link
          href="/search"
          className="mt-8 inline-flex rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-4 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.97]"
        >
          Shop the catalog
        </Link>
      </div>
    );
  }

  function nextFromAddress() {
    const required: (keyof AddressFormValues)[] = [
      "fullName",
      "phone",
      "email",
      "street",
      "city",
      "state",
      "postalCode",
    ];
    const errs: Partial<Record<keyof AddressFormValues, string>> = {};
    for (const k of required) {
      if (!shippingAddress[k]?.trim()) errs[k] = "Required";
    }
    if (
      shippingAddress.postalCode &&
      !/^\d{6}$/.test(shippingAddress.postalCode)
    ) {
      errs.postalCode = "Enter a valid 6-digit PIN";
    }
    if (
      shippingAddress.phone &&
      !/^(?:\+91|0)?[6-9]\d{9}$/.test(shippingAddress.phone)
    ) {
      errs.phone = "Enter a 10-digit Indian phone";
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length === 0) setStep("payment");
  }

  async function placeOrder(): Promise<CreatedOrder | null> {
    setSubmitting(true);

    const payload = {
      items: items.map((i) => ({
        productId: i.productId,
        ...(i.variantId ? { variantId: i.variantId } : {}),
        quantity: i.quantity,
        ...(i.customization ? { customization: i.customization } : {}),
      })),
      customerName: shippingAddress.fullName,
      customerEmail: shippingAddress.email,
      customerPhone: shippingAddress.phone,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        email: shippingAddress.email,
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
      },
      ...(billingSameAsShipping
        ? {}
        : {
            billingAddress: {
              fullName: billingAddress.fullName,
              phone: billingAddress.phone,
              email: billingAddress.email,
              street: billingAddress.street,
              city: billingAddress.city,
              state: billingAddress.state,
              postalCode: billingAddress.postalCode,
              country: billingAddress.country,
            },
          }),
      paymentMethod,
      ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // A gateway timeout or error page yields HTML, not JSON — don't let the
      // parse throw take the whole handler down with it.
      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.success) {
        const detail = body?.error?.details?.[0];
        toast.error(
          detail
            ? `${detail.field ?? "field"}: ${detail.message}`
            : body?.error?.message ??
                "We couldn't place your order. Please try again."
        );
        return null;
      }

      const order: CreatedOrder = body.data;
      setCreatedOrder(order);
      return order;
    } catch {
      // Network drop / aborted request. Without this the button below stays
      // disabled on "Placing order…" forever and the only way out is a reload,
      // which loses the address the customer just typed.
      toast.error(
        "Connection problem — your order was not placed. Please check your network and try again."
      );
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function onConfirmReview() {
    const order = await placeOrder();
    if (!order) return;

    if (order.paymentMethod === "RAZORPAY") {
      // Stay on this page — PaymentCheckout below handles the modal.
      toast.success("Order created — complete payment to confirm");
      return;
    }

    // Cash on delivery: clear cart, go to confirmation.
    clear();
    router.push(orderUrl(order));
  }

  const stepIndex = STEPS.findIndex((x) => x.id === step);
  const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-4 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
  const backBtn = "font-semibold text-slate-500 transition hover:text-slate-900";

  // Chrome (header, footer, cart drawer, toasts) comes from app/(shop)/layout.tsx.
  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <div className="mb-10">
        <Link href="/cart" className={backBtn}>
          ← Back to bag
        </Link>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-6xl">
          Checkout
        </h1>
      </div>

      {/* Progress */}
      <ol className="mb-10 flex items-center gap-3" aria-label="Checkout progress">
        {STEPS.map((s, idx) => {
          const active = idx === stepIndex;
          const completed = idx < stepIndex;
          return (
            <li
              key={s.id}
              className={`flex items-center gap-3 ${idx < STEPS.length - 1 ? "flex-1" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={`grid h-9 w-9 flex-none place-items-center rounded-full font-mono text-sm font-bold transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : completed
                      ? "bg-brand-500 text-slate-950"
                      : "bg-white text-slate-400 ring-1 ring-slate-200"
                }`}
              >
                {completed ? "✓" : idx + 1}
              </span>
              <span
                className={`text-sm font-semibold ${
                  active ? "text-slate-900" : completed ? "text-brand-700" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
              {idx < STEPS.length - 1 && (
                <span aria-hidden="true" className={`h-px flex-1 ${completed ? "bg-brand-400" : "bg-slate-200"}`} />
              )}
            </li>
          );
        })}
      </ol>

      <div className={`grid gap-8 ${step === "review" ? "" : "lg:grid-cols-[1fr_380px]"}`}>
        <div
          className={`rounded-[2rem] bg-white p-6 ring-1 ring-slate-200/70 sm:p-8 lg:p-10 ${
            step === "review" ? "mx-auto w-full max-w-3xl" : ""
          }`}
        >
          {step === "address" && (
            <>
              <h2 className="mb-6 font-display text-3xl font-semibold tracking-tight">Shipping address</h2>
              <AddressForm
                value={shippingAddress}
                onChange={setShippingAddress}
                errors={fieldErrors}
              />

              <label className="mt-6 flex cursor-pointer items-center gap-3 text-[15px] text-slate-700">
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                  className="h-5 w-5 rounded accent-brand-600"
                />
                Billing address is the same as shipping
              </label>

              {!billingSameAsShipping && (
                <div className="mt-8">
                  <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                    Billing address
                  </h3>
                  <AddressForm
                    value={billingAddress}
                    onChange={setBillingAddress}
                    includeEmail={false}
                  />
                </div>
              )}

              <div className="mt-10 flex justify-end">
                <button type="button" onClick={nextFromAddress} className={primaryBtn}>
                  Continue to payment →
                </button>
              </div>
            </>
          )}

          {step === "payment" && (
            <>
              <h2 className="mb-6 font-display text-3xl font-semibold tracking-tight">Payment method</h2>
              <div className="space-y-3">
                <PaymentOption
                  value="RAZORPAY"
                  current={paymentMethod}
                  onChange={setPaymentMethod}
                  title="Online payment (Razorpay)"
                  description={
                    onlinePaymentsEnabled
                      ? "Pay instantly with UPI, card, or netbanking."
                      : "Coming soon — choose Cash on delivery to place your order now."
                  }
                  disabled={!onlinePaymentsEnabled}
                  badge={!onlinePaymentsEnabled ? "Coming soon" : undefined}
                  onDisabledClick={() => {
                    toast("Online payments are coming soon — choose Cash on delivery instead.", {
                      icon: "💵",
                    });
                    setPaymentMethod("COD");
                  }}
                />
                <PaymentOption
                  value="COD"
                  current={paymentMethod}
                  onChange={setPaymentMethod}
                  title="Cash on delivery"
                  description="Pay when your order is delivered."
                />
              </div>

              <div className="mt-10 flex items-center justify-between">
                <button type="button" onClick={() => setStep("address")} className={backBtn}>
                  ← Back
                </button>
                <button type="button" onClick={() => setStep("review")} className={primaryBtn}>
                  Review order →
                </button>
              </div>
            </>
          )}

          {step === "review" && (
            <>
              <h2 className="mb-6 font-display text-3xl font-semibold tracking-tight">Review &amp; place order</h2>
              <OrderReview
                items={items}
                pricing={pricingWithDiscount}
                discountLabel={discountInfo?.name}
                shippingAddress={shippingAddress}
                paymentMethod={paymentMethod}
              />

              <div className="mt-6">
                <label
                  htmlFor="discount-code"
                  className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500"
                >
                  Discount code
                </label>
                <input
                  id="discount-code"
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 font-mono text-[15px] ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {/* Live feedback so the customer isn't guessing. */}
                {discountError ? (
                  <p className="mt-2 text-sm font-medium text-red-600">
                    {discountError}
                  </p>
                ) : discountInfo ? (
                  <p className="mt-2 text-sm font-medium text-brand-700">
                    {discountInfo.automatic
                      ? `${discountInfo.name} applied — you save ${formatRupee(discountInfo.amount)}`
                      : `Code applied — you save ${formatRupee(discountInfo.amount)}`}
                    {discountBeaten &&
                      ` (better than your code, so we used ${discountInfo.name})`}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Have a code? Enter it above — the total updates instantly.
                  </p>
                )}
              </div>

              {createdOrder && paymentMethod === "RAZORPAY" ? (
                <div className="mt-8 rounded-[1.5rem] bg-brand-50 p-5 text-[15px] text-brand-900 ring-1 ring-brand-200">
                  <p className="mb-4 font-semibold">
                    Order <span className="font-mono">{createdOrder.orderNumber}</span> created — complete
                    payment below.
                  </p>
                  <PaymentCheckout
                    orderId={createdOrder.id}
                    orderNumber={createdOrder.orderNumber}
                    amountInRupees={createdOrder.total}
                    customerName={shippingAddress.fullName}
                    customerEmail={shippingAddress.email}
                    customerPhone={shippingAddress.phone}
                    onSuccess={() => {
                      clear();
                      router.push(orderUrl(createdOrder));
                    }}
                    onFailure={(m) => toast.error(m)}
                  />
                </div>
              ) : (
                <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                  <button type="button" onClick={() => setStep("payment")} className={backBtn}>
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={onConfirmReview}
                    disabled={submitting}
                    className={primaryBtn}
                  >
                    {submitting ? "Placing order…" : `Place order · ${formatRupee(pricingWithDiscount.total)}`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Order summary — on the review step the full review replaces it. */}
        {step !== "review" && (
          <aside className="h-fit rounded-[2rem] bg-white p-7 ring-1 ring-slate-200/70 lg:sticky lg:top-24">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Order summary</h2>
            <ul className="mt-6 space-y-4">
              {items.map((item) => (
                <li key={`${item.productId}::${item.variantId ?? "_"}`} className="flex items-center gap-3">
                  <div className="relative h-16 w-12 flex-none overflow-hidden rounded-xl">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      productId={item.productId}
                      aspectClass="h-full w-full"
                      variant="mini"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">
                      {item.variantName ? `${item.variantName} · ` : ""}
                      <span className="font-mono">× {item.quantity}</span>
                    </p>
                  </div>
                  <p className="font-mono text-sm font-semibold">{formatRupee(item.unitPrice * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="font-mono font-medium">{formatRupee(pricingWithDiscount.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Shipping</dt>
                <dd className="font-mono font-medium">
                  {pricingWithDiscount.shipping === 0 ? "Free" : formatRupee(pricingWithDiscount.shipping)}
                </dd>
              </div>
              {pricingWithDiscount.discount > 0 && (
                <div className="flex justify-between text-brand-700">
                  <dt>Discount{discountInfo?.name ? ` · ${discountInfo.name}` : ""}</dt>
                  <dd className="font-mono font-medium">− {formatRupee(pricingWithDiscount.discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-slate-100 pt-4">
                <dt className="font-display text-lg font-semibold">Total</dt>
                <dd className="font-mono text-2xl font-bold">{formatRupee(pricingWithDiscount.total)}</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-slate-500">
              Printed to order and checked by hand before it ships.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}

function PaymentOption({
  value,
  current,
  onChange,
  title,
  description,
  disabled = false,
  badge,
  onDisabledClick,
}: {
  value: PaymentMethod;
  current: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
  title: string;
  description: string;
  disabled?: boolean;
  badge?: string;
  onDisabledClick?: () => void;
}) {
  const selected = current === value && !disabled;
  return (
    <label
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          onDisabledClick?.();
        }
      }}
      className={`flex items-start gap-4 rounded-[1.5rem] p-5 transition ${
        disabled
          ? "cursor-not-allowed bg-slate-50 opacity-70 ring-1 ring-slate-200"
          : selected
            ? "cursor-pointer bg-brand-50/60 ring-2 ring-brand-500"
            : "cursor-pointer bg-white ring-1 ring-slate-200 hover:ring-slate-400"
      }`}
    >
      <input
        type="radio"
        name="payment-method"
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={() => !disabled && onChange(value)}
        className="mt-1 h-4 w-4 accent-brand-600"
      />
      <span>
        <span className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold tracking-tight">
          {title}
          {badge && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-[15px] text-slate-500">{description}</span>
      </span>
    </label>
  );
}
