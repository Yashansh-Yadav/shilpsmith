"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  // "lg" by default; "xl" for the product form which is denser.
  size?: "md" | "lg" | "xl";
  // Pinned below the scroll area so actions stay reachable on long forms. A
  // submit button here sits outside the <form>, so it needs form="<form id>".
  footer?: React.ReactNode;
}

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  size = "lg",
  footer,
}: Props) {
  // Lock page scroll + escape to close while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // The panel is capped to the viewport and scrolls its *body*; the overlay
    // itself must not scroll. Centering a taller-than-viewport child inside a
    // scrolling flex container clips its top irrecoverably (you can't scroll
    // up past it) — which is what hid the header on the long product form.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className={`relative flex max-h-[calc(100dvh-2rem)] w-full ${SIZE[size]} flex-col overflow-hidden rounded-3xl bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex flex-none items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-100 text-lg hover:bg-slate-200"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {children}
        </div>

        {footer && (
          <div className="flex-none border-t border-slate-100 bg-white px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
