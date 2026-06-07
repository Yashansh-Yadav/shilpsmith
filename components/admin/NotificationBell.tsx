"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ShoppingBag, LifeBuoy, Star, Check } from "lucide-react";

interface NotificationItem {
  id: string;
  type: "order" | "support" | "review";
  title: string;
  description: string;
  href: string;
  createdAt: string;
  attention?: boolean;
}

// Per-device read state. We don't persist read/unread server-side (no
// notifications table); "seen" is the timestamp of the last "mark all read".
const SEEN_KEY = "admin-notifications-seen";
const POLL_MS = 45_000;

const ICONS = {
  order: ShoppingBag,
  support: LifeBuoy,
  review: Star,
} as const;

const ICON_STYLES = {
  order: "bg-emerald-50 text-emerald-700",
  support: "bg-amber-50 text-amber-700",
  review: "bg-violet-50 text-violet-700",
} as const;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<number>(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Load the "last seen" marker once.
  useEffect(() => {
    const raw =
      typeof window !== "undefined" ? window.localStorage.getItem(SEEN_KEY) : null;
    setSeen(raw ? Number(raw) : 0);
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      const body = await res.json();
      if (res.ok && body.success) setItems(body.data.items as NotificationItem[]);
    } catch {
      /* transient — keep showing the last fetched list */
    }
  }, []);

  // Initial fetch + polling.
  useEffect(() => {
    fetchItems();
    const id = setInterval(fetchItems, POLL_MS);
    return () => clearInterval(id);
  }, [fetchItems]);

  // Refetch when the panel is opened so it's current.
  useEffect(() => {
    if (open) fetchItems();
  }, [open, fetchItems]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((i) => new Date(i.createdAt).getTime() > seen);
  const unreadCount = unread.length;

  function markAllRead() {
    const now = Date.now();
    window.localStorage.setItem(SEEN_KEY, String(now));
    setSeen(now);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96 lg:left-0 lg:right-auto">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  {unreadCount} new
                </span>
              )}
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
              >
                <Check className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {items.map((item) => {
                  const Icon = ICONS[item.type];
                  const isUnread = new Date(item.createdAt).getTime() > seen;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                          isUnread ? "bg-brand-50/40" : ""
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg ${
                            ICON_STYLES[item.type]
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900">
                              {item.title}
                            </span>
                            {item.attention && (
                              <span className="h-1.5 w-1.5 flex-none rounded-full bg-red-500" />
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {item.description}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            {relativeTime(item.createdAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
