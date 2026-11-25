import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import StorefrontChrome from "../shop/StorefrontChrome";

// Standard wrapper for every public page except the homepage: the shared
// header (search + cart), the page body, the footer, and the client-only chrome
// (cart drawer + toast host). Pages inside it must NOT mount their own
// <Toaster />, <CartSheet /> or <CartButton /> — this is the single mount point.
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <SiteHeader variant="solid" />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <StorefrontChrome />
    </div>
  );
}
