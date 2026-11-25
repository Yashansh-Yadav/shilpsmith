// app/(shop)/layout.tsx
//
// Cart, checkout, order confirmation and tracking all share the storefront
// chrome. PageShell is the single mount point for the header (with its cart
// button), footer, cart drawer and toast host — pages in this group must not
// mount their own.

import PageShell from "../../components/site/PageShell";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
