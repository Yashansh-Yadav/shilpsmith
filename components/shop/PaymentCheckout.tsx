"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (resp: unknown) => void) => void;
    };
  }
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

interface Props {
  orderId: number;
  orderNumber: string;
  amountInRupees: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onSuccess: () => void;
  onFailure?: (message: string) => void;
}

export default function PaymentCheckout({
  orderId,
  orderNumber,
  amountInRupees,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onFailure,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [keyId, setKeyId] = useState<string | null>(null);

  useEffect(() => {
    setKeyId(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null);
  }, []);

  async function handlePay() {
    if (!keyId) {
      onFailure?.("Razorpay is not configured");
      return;
    }
    setLoading(true);

    const scriptLoaded = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );
    if (!scriptLoaded || !window.Razorpay) {
      setLoading(false);
      onFailure?.("Failed to load Razorpay checkout");
      return;
    }

    const createRes = await fetch("/api/payments/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const createBody = await createRes.json();
    if (!createRes.ok || !createBody.success) {
      setLoading(false);
      onFailure?.(createBody?.error?.message ?? "Failed to create payment");
      return;
    }

    const { razorpayOrderId, amount, currency } = createBody.data;

    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      order_id: razorpayOrderId,
      name: "ShilpSmith",
      description: `Order ${orderNumber}`,
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone,
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        const verifyRes = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            paymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          }),
        });
        const verifyBody = await verifyRes.json();
        setLoading(false);
        if (!verifyRes.ok || !verifyBody.success) {
          onFailure?.(verifyBody?.error?.message ?? "Payment verification failed");
          return;
        }
        onSuccess();
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    });
    rzp.open();
    // Unused amountInRupees: Razorpay uses paise from server; we surface the
    // rupee value only for any client-side display callers may want.
    void amountInRupees;
  }

  if (!keyId) {
    return (
      <p className="text-sm text-red-600">
        Razorpay is not configured (set NEXT_PUBLIC_RAZORPAY_KEY_ID).
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={loading}
      className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {loading ? "Processing…" : "Pay with Razorpay"}
    </button>
  );
}
