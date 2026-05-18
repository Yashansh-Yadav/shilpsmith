"use client";

interface Product {
  id: number;

  name: string;

  price: string;

  featured: boolean;

  customizable: boolean;
}

export const ProductTable = ({ products }: { products: Product[] }) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left p-4">
              Product
            </th>

            <th className="text-left p-4">
              Price
            </th>

            <th className="text-left p-4">
              Featured
            </th>

            <th className="text-left p-4">
              Customizable
            </th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-t"
            >
              <td className="p-4">
                {product.name}
              </td>

              <td className="p-4">
                ₹{product.price}
              </td>

              <td className="p-4">
                {product.featured
                  ? "Yes"
                  : "No"}
              </td>

              <td className="p-4">
                {product.customizable
                  ? "Yes"
                  : "No"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}