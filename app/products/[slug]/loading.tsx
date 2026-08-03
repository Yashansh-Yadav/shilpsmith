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
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Block className="mb-8 h-5 w-64" />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Block className="aspect-square w-full rounded-4xl" />

        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <Block className="h-3 w-28" />
            <Block className="h-10 w-4/5" />
            <Block className="h-4 w-40" />
          </div>
          <Block className="h-9 w-48" />
          <Block className="h-8 w-44 rounded-full" />
          <div className="space-y-2">
            <Block className="h-4 w-full" />
            <Block className="h-4 w-11/12" />
            <Block className="h-4 w-2/3" />
          </div>
          <div className="flex gap-3">
            <Block className="h-14 flex-1 rounded-2xl" />
            <Block className="h-14 flex-1 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
