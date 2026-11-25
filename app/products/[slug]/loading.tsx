// app/products/[slug]/loading.tsx
//
// Shown the instant a product link is clicked. Two reasons this file matters
// more than it looks:
//
//  1. The page is server-rendered off a Neon pooler that regularly takes ~1s
//     per roundtrip. Without a loading boundary the browser sits on the OLD
//     page for that whole time and the click reads as "nothing happened".
//  2. Next only prefetches a dynamic route up to its nearest loading boundary.
//     No loading.tsx meant no prefetchable shell, so every click paid full
//     cold-start latency.
//
// Mirrors the real layout closely enough that content doesn't jump on swap.

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
}

export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8 lg:pt-10">
      <Block className="mb-8 h-4 w-64 rounded-full" />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <Block className="aspect-[2/3] max-h-[78vh] w-full rounded-[2rem]" />

        <div className="flex flex-col gap-6">
          <div className="space-y-4">
            <Block className="h-3 w-32 rounded-full" />
            <Block className="h-14 w-4/5" />
            <Block className="h-4 w-40 rounded-full" />
          </div>
          <Block className="h-10 w-48" />
          <div className="space-y-2">
            <Block className="h-4 w-full rounded-full" />
            <Block className="h-4 w-11/12 rounded-full" />
            <Block className="h-4 w-2/3 rounded-full" />
          </div>
          <Block className="h-40 w-full rounded-[1.75rem]" />
          <div className="flex gap-3">
            <Block className="h-14 flex-1 rounded-full" />
            <Block className="h-14 flex-1 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
