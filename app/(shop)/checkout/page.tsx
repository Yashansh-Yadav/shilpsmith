"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import { useCartStore, computePricing } from "../../../lib/store/cart";
import { useShippingConfig } from "../../../lib/useShippingConfig";
import AddressForm, {
  EMPTY_ADDRESS,
  type AddressFormValues,
} from "../../../components/shop/AddressForm";
import OrderReview from "../../../components/shop/OrderReview";
import PaymentCheckout from "../../../components/shop/PaymentCheckout";

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
      <main className="min-h-screen bg-slate-50 py-10">
        <Toaster />
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="mb-3 text-2xl font-bold">Your cart is empty</h1>
          <p className="mb-6 text-slate-500">
            Add items to your cart before checking out.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Browse products
          </Link>
        </div>
      </main>
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

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <Toaster />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/cart" className="text-sm text-slate-600 hover:text-slate-900">
            ← Back to cart
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Checkout</h1>
        </div>

        {/* Progress */}
        <ol className="mb-8 flex gap-2 text-xs font-medium">
          {STEPS.map((s, idx) => {
            const active = step === s.id;
            const completed = STEPS.findIndex((x) => x.id === step) > idx;
            return (
              <li
                key={s.id}
                className={`flex-1 rounded-full px-3 py-2 text-center transition ${
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : completed
                      ? "bg-brand-50 text-brand-700 ring-1 ring-brand-600/20"
                      : "bg-slate-200 text-slate-600"
                }`}
              >
                {idx + 1}. {s.label}
              </li>
            );
          })}
        </ol>

        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          {step === "address" && (
            <>
              <h2 className="mb-4 text-xl font-bold">Shipping address</h2>
              <AddressForm
                value={shippingAddress}
                onChange={setShippingAddress}
                errors={fieldErrors}
              />

              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                />
                Billing address is the same as shipping
              </label>

              {!billingSameAsShipping && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Billing address
                  </h3>
                  <AddressForm
                    value={billingAddress}
                    onChange={setBillingAddress}
                    includeEmail={false}
                  />
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={nextFromAddress}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Continue to payment
                </button>
              </div>
            </>
          )}

          {step === "payment" && (
            <>
              <h2 className="mb-4 text-xl font-bold">Payment method</h2>
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

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep("address")}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Review order
                </button>
              </div>
            </>
          )}

          {step === "review" && (
            <>
              <h2 className="mb-4 text-xl font-bold">Review &amp; place order</h2>
              <OrderReview
                items={items}
                pricing={pricingWithDiscount}
                discountLabel={discountInfo?.name}
                shippingAddress={shippingAddress}
                paymentMethod={paymentMethod}
              />

              <div className="mt-6">
                <label className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Discount code
                </label>
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                />
                {/* Live feedback so the customer isn't guessing. */}
                {discountError ? (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {discountError}
                  </p>
                ) : discountInfo ? (
                  <p className="mt-1 text-xs font-medium text-emerald-700">
                    {discountInfo.automatic
                      ? `${discountInfo.name} applied — you save ${formatRupee(discountInfo.amount)}`
                      : `Code applied — you save ${formatRupee(discountInfo.amount)}`}
                    {discountBeaten &&
                      ` (better than your code, so we used ${discountInfo.name})`}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Have a code? Enter it above — the total updates instantly.
                  </p>
                )}
              </div>

              {createdOrder && paymentMethod === "RAZORPAY" ? (
                <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="mb-3 font-semibold">
                    Order {createdOrder.orderNumber} created — complete payment
                    below.
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
                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep("payment")}
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={onConfirmReview}
                    disabled={submitting}
                    className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                  >
                    {submitting ? "Placing order…" : "Place order"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
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
      className={`flex items-start gap-3 rounded-2xl border p-4 ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50/60 opacity-70"
          : selected
            ? "cursor-pointer border-black bg-slate-50"
            : "cursor-pointer border-slate-200"
      }`}
    >
      <input
        type="radio"
        name="payment-method"
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={() => !disabled && onChange(value)}
        className="mt-1"
      />
      <span>
        <span className="flex items-center gap-2 font-semibold">
          {title}
          {badge && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              {badge}
            </span>
          )}
        </span>
        <span className="block text-sm text-slate-500">{description}</span>
      </span>
    </label>
  );
}
