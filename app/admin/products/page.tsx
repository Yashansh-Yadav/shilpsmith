import Link from "next/link";

export default function ProductsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Products
          </h1>

          <p className="text-slate-500 mt-1">
            Manage all products
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="bg-black text-white px-5 py-3 rounded-xl"
        >
          Add Product
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        Product table will come here
      </div>
    </div>
  );
}