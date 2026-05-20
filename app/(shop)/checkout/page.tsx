"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import { useCartStore, computePricing } from "../../../lib/store/cart";
import AddressForm, {
  EMPTY_ADDRESS,
  type AddressFormValues,
} from "../../../components/shop/AddressForm";
import OrderReview from "../../../components/shop/OrderReview";
import PaymentCheckout from "../../../components/shop/PaymentCheckout";

type Step = "address" | "payment" | "review";
type PaymentMethod = "RAZORPAY" | "WHATSAPP" | "COD";

interface CreatedOrder {
  id: number;
  orderNumber: string;
  total: number;
  paymentMethod: PaymentMethod;
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
  const pricing = useMemo(() => computePricing(items), [items]);

  const [step, setStep] = useState<Step>("address");
  const [shippingAddress, setShippingAddress] =
    useState<AddressFormValues>(EMPTY_ADDRESS);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] =
    useState<AddressFormValues>(EMPTY_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("WHATSAPP");
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof AddressFormValues, string>>
  >({});
  const [discountCode, setDiscountCode] = useState("");

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

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setSubmitting(false);

    if (!res.ok || !body.success) {
      const detail = body?.error?.details?.[0];
      toast.error(
        detail
          ? `${detail.field ?? "field"}: ${detail.message}`
          : body?.error?.message ?? "Failed to create order"
      );
      return null;
    }

    const order: CreatedOrder = body.data;
    setCreatedOrder(order);
    return order;
  }

  async function onConfirmReview() {
    const order = await placeOrder();
    if (!order) return;

    if (order.paymentMethod === "RAZORPAY") {
      // Stay on this page — PaymentCheckout below handles the modal.
      toast.success("Order created — complete payment to confirm");
      return;
    }

    // Offline payment paths: clear cart, go to confirmation.
    clear();
    if (order.paymentMethod === "WHATSAPP") {
      const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
      const msg = encodeURIComponent(
        `Hi! I just placed order ${order.orderNumber} on ShilpSmith. Please confirm.`
      );
      if (phone) {
        window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
      }
    }
    router.push(`/order/${order.id}`);
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
                  description="Pay instantly with UPI, card, or netbanking."
                />
                <PaymentOption
                  value="WHATSAPP"
                  current={paymentMethod}
                  onChange={setPaymentMethod}
                  title="Confirm via WhatsApp"
                  description="Place the order now and finalize payment over WhatsApp."
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
                pricing={pricing}
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
                <p className="mt-1 text-xs text-slate-500">
                  Applied server-side. Validation errors will show here on submit.
                </p>
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
                      router.push(`/order/${createdOrder.id}`);
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
}: {
  value: PaymentMethod;
  current: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
  title: string;
  description: string;
}) {
  const selected = current === value;
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
        selected ? "border-black bg-slate-50" : "border-slate-200"
      }`}
    >
      <input
        type="radio"
        name="payment-method"
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        className="mt-1"
      />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-slate-500">{description}</span>
      </span>
    </label>
  );
}
