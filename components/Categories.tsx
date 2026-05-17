// components/Categories.tsx

import Link from "next/link";

const categories = [
  {
    emoji: "🎁",
    title: "Personalized Gifts",
    desc: "Custom figurines and keepsakes.",
    slug: "personalized-gifts",
    query: "custom gifts"
  },
  {
    emoji: "🏠",
    title: "Home & Decor",
    desc: "Modern decor accessories.",
    slug: "home-decor",
    query: "home decor"
  },
  {
    emoji: "🧠",
    title: "Educational & Student",
    desc: "Study tools and models.",
    slug: "educational-student",
    query: "educational products"
  },
  {
    emoji: "⚙️",
    title: "Functional Products",
    desc: "Organizers and utility products.",
    slug: "functional-products",
    query: "utility products"
  },
  {
    emoji: "✨",
    title: "Jewelry & Fashion",
    desc: "Wearable custom art.",
    slug: "jewelry-fashion",
    query: "fashion accessories"
  },
  {
    emoji: "🛕",
    title: "Spiritual & Artistic",
    desc: "Idols and sculptures.",
    slug: "spiritual-artistic",
    query: "spiritual decor"
  }
];

export default function Categories() {
  return (
    <section id="categories" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-4xl font-bold">
            Explore Categories
          </h2>

          <p className="mt-4 text-slate-600">
            Browse products by niche and discover inspiration.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}?query=${category.query}`}
              className="
                bg-white
                rounded-3xl
                p-6
                border
                border-slate-100
                hover:shadow-xl
                transition-all
                group
              "
            >
              <div className="text-4xl mb-4">
                {category.emoji}
              </div>

              <h3 className="font-bold text-lg group-hover:text-brand-600 transition">
                {category.title}
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                {category.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}