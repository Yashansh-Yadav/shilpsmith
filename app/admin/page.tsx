"use client";

import { useEffect, useState } from "react";

import toast, { Toaster } from "react-hot-toast";

interface Product {
  images: any;
  id: number;
  category: string;
  name: string;
  description: string;
  price: string;
  image: string;
  customizable: boolean;
}

const initialForm = {
  category: "",
  name: "",
  description: "",
  price: "",
  image: "",
  customizable: false
};

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState(initialForm);

  async function fetchProducts() {
    const response = await fetch("/api/admin/products");

    const data = await response.json();

    setProducts(data);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  async function uploadImage(file: File) {
    setUploading(true);

    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    setUploading(false);

    return data.url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    const method = editingId ? "PUT" : "POST";

    const url = editingId
      ? `/api/admin/products/${editingId}`
      : "/api/admin/products";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    if (response.ok) {
      toast.success(
        editingId
          ? "Product updated"
          : "Product created"
      );

      setForm(initialForm);

      setEditingId(null);

      fetchProducts();
    } else {
      toast.error("Something went wrong");
    }

    setLoading(false);
  }

  async function handleDelete(id: number) {
    const confirmed = confirm(
      "Delete this product?"
    );

    if (!confirmed) return;

    const response = await fetch(
      `/api/admin/products/${id}`,
      {
        method: "DELETE"
      }
    );

    if (response.ok) {
      toast.success("Product deleted");

      fetchProducts();
    }
  }

  function handleEdit(product: Product) {
    setEditingId(product.id);

    setForm({
      category: product.category,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      customizable: product.customizable
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <Toaster />

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm p-6 md:p-8 mb-8">
          <h1 className="text-3xl font-bold mb-6">
            ShilpSmith Admin Panel
          </h1>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <input
              type="text"
              placeholder="Category"
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value
                })
              }
              className="border rounded-xl px-4 py-3"
              required
            />

            <input
              type="text"
              placeholder="Product Name"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value
                })
              }
              className="border rounded-xl px-4 py-3"
              required
            />

            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value
                })
              }
              className="border rounded-xl px-4 py-3 md:col-span-2"
              rows={4}
              required
            />

            <input
              type="text"
              placeholder="Price"
              value={form.price}
              onChange={(e) =>
                setForm({
                  ...form,
                  price: e.target.value
                })
              }
              className="border rounded-xl px-4 py-3"
              required
            />

            <div>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];

                  if (!file) return;

                  const imageUrl = await uploadImage(file);

                  setForm({
                    ...form,
                    image: imageUrl
                  });

                  toast.success(
                    "Image uploaded"
                  );
                }}
                className="border rounded-xl px-4 py-3 w-full"
              />

              {uploading && (
                <p className="text-sm mt-2">
                  Uploading image...
                </p>
              )}
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.customizable}
                onChange={(e) =>
                  setForm({
                    ...form,
                    customizable: e.target.checked
                  })
                }
              />

              Customizable Product
            </label>

            {form?.image && (
              <img
                src={form?.image}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-2xl border"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white rounded-xl py-3 px-6 font-semibold hover:opacity-90 md:col-span-2"
            >
              {loading
                ? "Saving..."
                : editingId
                  ? "Update Product"
                  : "Create Product"}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100"
            >
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                  src={
                    product.images?.[0]?.url ||
                    "/placeholder.png"
                  }
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-4">
                <h2 className="font-bold text-lg line-clamp-1">
                  {product.name}
                </h2>

                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {product.description}
                </p>

                <p className="font-semibold mt-3 text-emerald-600">
                  ₹{product.price}
                </p>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(product.id)
                    }
                    className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}