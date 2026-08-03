"use client";

import { Toaster } from "react-hot-toast";

import CartSheet from "./CartSheet";

// Client-only chrome every shopping surface needs: the slide-out cart and the
// toast host. Bundled here so a SERVER page (like the product detail page) can
// mount both without becoming a client component itself — react-hot-toast's
// Toaster isn't marked "use client" and can't be imported from a server file.
export default function StorefrontChrome() {
  return (
    <>
      <Toaster />
      <CartSheet />
    </>
  );
}
