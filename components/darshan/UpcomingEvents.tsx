"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface UpcomingItem {
  day: string;
  month: string;
  label: string;
  note: string; // already resolved to the current language ("" if none)
}

// Accordion list of upcoming events. A row with a note is tappable: it expands
// to show the full note inline (rows without a note aren't interactive).
export default function UpcomingEvents({
  items,
  emptyLabel,
}: {
  items: UpcomingItem[];
  emptyLabel: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-900/5">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="max-h-[26rem] overflow-y-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-900/5">
      <ul className="divide-y divide-slate-100">
        {items.map((e, i) => {
          const hasNote = !!e.note;
          const expanded = open === i;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => hasNote && setOpen(expanded ? null : i)}
                aria-expanded={hasNote ? expanded : undefined}
                className={`flex w-full items-center gap-3 px-2 py-2.5 text-left ${
                  hasNote ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
                }`}
              >
                <div className="w-11 flex-none rounded-xl bg-rose-50 py-1 text-center">
                  <div className="text-base font-bold leading-none text-rose-600">
                    {e.day}
                  </div>
                  <div className="text-[10px] uppercase text-rose-400">
                    {e.month}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-medium text-slate-800 ${
                      expanded ? "" : "truncate"
                    }`}
                  >
                    {e.label}
                  </div>
                  {hasNote && !expanded && (
                    <div className="truncate text-xs text-slate-400">
                      {e.note}
                    </div>
                  )}
                </div>
                {hasNote && (
                  <ChevronDown
                    className={`h-4 w-4 flex-none text-slate-300 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>
              {hasNote && expanded && (
                <div className="px-2 pb-3 pl-14 text-xs leading-relaxed text-slate-500">
                  {e.note}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
