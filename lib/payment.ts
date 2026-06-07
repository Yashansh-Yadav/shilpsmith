import crypto from "crypto";
import Razorpay from "razorpay";

import { ApiError } from "./errors";

let _client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (_client) return _client;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "Razorpay is not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)"
    );
  }
  _client = new Razorpay({ key_id, key_secret });
  return _client;
}

export function verifyRazorpaySignature(params: {
  razorpayOrderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${params.razorpayOrderId}|${params.paymentId}`)
    .digest("hex");

  // Constant-time comparison; both buffers must be the same length to compare.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(params.signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
