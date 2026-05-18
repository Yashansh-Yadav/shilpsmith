// components/ProductModal.tsx

"use client";

type Props = {
  product: any;
  onClose: () => void;
};

export default function ProductModal({
  product,
  onClose
}: Props) {
  if (!product) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        bg-black/70
        backdrop-blur-sm
        flex
        items-center
        justify-center
        p-3
        lg:p-6
      "
    >
      {/* MODAL CONTAINER */}
      <div
        className="
          relative
          bg-white
          rounded-3xl
          w-full
          max-w-5xl
          max-h-[95vh]
          overflow-y-auto
        "
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="
            absolute
            top-4
            right-4
            z-20
            w-10
            h-10
            rounded-full
            bg-white/90
            backdrop-blur
            shadow-lg
            flex
            items-center
            justify-center
            text-xl
          "
        >
          ✕
        </button>

        {/* CONTENT */}
        <div
          className="
            grid
            lg:grid-cols-2
          "
        >
          {/* IMAGE */}
          <div className="relative">
            <img
              src={product.images?.[0]?.url ||
                "/placeholder.png"}
              alt={product.images?.[0]?.url ||
                "/placeholder.png"}
              className="
                w-full
                h-64
                sm:h-80
                lg:h-full
                object-cover
                lg:rounded-l-3xl
              "
            />
          </div>

          {/* DETAILS */}
          <div
            className="
              p-5
              sm:p-8
              lg:p-10
              flex
              flex-col
            "
          >
            <h2
              className="
                text-2xl
                sm:text-3xl
                lg:text-4xl
                font-black
                leading-tight
                pr-10
              "
            >
              {product.name}
            </h2>

            <p
              className="
                text-brand-600
                text-xl
                sm:text-2xl
                font-bold
                mt-3
              "
            >
              {product.price}
            </p>

            <p
              className="
                mt-6
                text-slate-600
                leading-7
                text-sm
                sm:text-base
              "
            >
              {product.description}
            </p>

            {/* PERSONALIZATION */}
            {product.customizable === 1 && (
              <div className="mt-8 space-y-4">
                <div>
                  <label
                    className="
                      text-sm
                      font-semibold
                      block
                      mb-2
                    "
                  >
                    Name / Text
                  </label>

                  <input
                    placeholder="Enter custom name"
                    className="
                      w-full
                      border
                      border-slate-200
                      rounded-2xl
                      px-4
                      py-3
                      outline-none
                      focus:border-brand-500
                    "
                  />
                </div>

                <div>
                  <label
                    className="
                      text-sm
                      font-semibold
                      block
                      mb-2
                    "
                  >
                    Instructions
                  </label>

                  <textarea
                    rows={4}
                    placeholder="Add your customization details"
                    className="
                      w-full
                      border
                      border-slate-200
                      rounded-2xl
                      px-4
                      py-3
                      outline-none
                      focus:border-brand-500
                    "
                  />
                </div>

                <div>
                  <label
                    className="
                      text-sm
                      font-semibold
                      block
                      mb-2
                    "
                  >
                    Upload Reference
                  </label>

                  <input
                    type="file"
                    className="
                      w-full
                      border
                      border-slate-200
                      rounded-2xl
                      px-4
                      py-3
                    "
                  />
                </div>
              </div>
            )}

            {/* CTA */}
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi I want to order ${product.name}`}
              target="_blank"
              className="
                mt-8
                bg-brand-600
                hover:bg-brand-700
                text-white
                text-center
                py-4
                rounded-2xl
                font-semibold
                transition
              "
            >
              Place Order
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}