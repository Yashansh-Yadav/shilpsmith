// app/categories/[slug]/page.tsx

import ProductGrid from "../../../components/ProductGrid";

const categoryMap: Record<
  string,
  string
> = {
  "personalized-gifts":
    "personalized-gifts",

  "home-decor":
    "home-decor",

  "educational-student":
    "educational-student",

  "functional-products":
    "functional-products"
};

export default async function CategoryPage({
  params
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  // IMPORTANT FIX
  const { slug } = await params;

  const category =
    categoryMap[slug];

  const title = slug
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14">
          <h1 className="text-5xl font-black">
            {title}
          </h1>

          <p className="mt-4 text-slate-600 text-lg">
            Explore premium 3D printed
            products.
          </p>
        </div>

        <ProductGrid category={category} />
      </div>
    </main>
  );
}