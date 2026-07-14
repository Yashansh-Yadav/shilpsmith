"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import NotificationBell from "./NotificationBell";

const NAV: { href: string; label: string; match?: RegExp }[] = [
  { href: "/admin", label: "Products", match: /^\/admin\/?$/ },
  { href: "/admin/deities", label: "Deities", match: /^\/admin\/deities/ },
  { href: "/admin/orders", label: "Orders", match: /^\/admin\/orders/ },
  { href: "/admin/inventory", label: "Inventory", match: /^\/admin\/inventory/ },
  { href: "/admin/analytics", label: "Analytics", match: /^\/admin\/analytics/ },
  { href: "/admin/customers", label: "Customers", match: /^\/admin\/customers/ },
  { href: "/admin/reviews", label: "Reviews", match: /^\/admin\/reviews/ },
  { href: "/admin/discounts", label: "Discounts", match: /^\/admin\/discounts/ },
  { href: "/admin/support", label: "Support", match: /^\/admin\/support/ },
  { href: "/admin/settings", label: "Settings", match: /^\/admin\/settings/ },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="flex-none border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-5">
          <div className="min-w-0">
            <Link href="/admin" className="block text-lg font-bold">
              ShilpSmith Admin
            </Link>
            <p className="text-xs text-slate-500">Internal dashboard</p>
          </div>
          <NotificationBell />
        </div>

        <nav className="flex-1 overflow-y-auto p-3 lg:p-4">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
            {NAV.map((item) => {
              const active = item.match
                ? item.match.test(pathname ?? "")
                : pathname === item.href;
              return (
                <li key={item.href} className="flex-none">
                  <Link
                    href={item.href}
                    className={`block whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden border-t border-slate-100 p-3 lg:block">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin-login" })}
            className="w-full rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
