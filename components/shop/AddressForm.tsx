"use client";

export interface AddressFormValues {
  fullName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const EMPTY_ADDRESS: AddressFormValues = {
  fullName: "",
  phone: "",
  email: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
};

interface Props {
  value: AddressFormValues;
  onChange: (next: AddressFormValues) => void;
  includeEmail?: boolean;
  // Optional field-level error map produced by server-side Zod validation.
  errors?: Partial<Record<keyof AddressFormValues, string>>;
}

export default function AddressForm({
  value,
  onChange,
  includeEmail = true,
  errors,
}: Props) {
  function set<K extends keyof AddressFormValues>(
    key: K,
    val: AddressFormValues[K]
  ) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Field label="Full name" error={errors?.fullName} className="sm:col-span-2">
        <input
          required
          value={value.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 group-data-[error=true]/field:ring-2 group-data-[error=true]/field:ring-red-500"
          autoComplete="name"
        />
      </Field>

      <Field label="Phone (10-digit)" error={errors?.phone}>
        <input
          required
          inputMode="numeric"
          value={value.phone}
          onChange={(e) => set("phone", e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 group-data-[error=true]/field:ring-2 group-data-[error=true]/field:ring-red-500"
          autoComplete="tel"
        />
      </Field>

      {includeEmail && (
        <Field label="Email" error={errors?.email}>
          <input
            type="email"
            required
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
            className="w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 group-data-[error=true]/field:ring-2 group-data-[error=true]/field:ring-red-500"
            autoComplete="email"
          />
        </Field>
      )}

      <Field label="Street address" error={errors?.street} className="sm:col-span-2">
        <input
          required
          value={value.street}
          onChange={(e) => set("street", e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 group-data-[error=true]/field:ring-2 group-data-[error=true]/field:ring-red-500"
          autoComplete="street-address"
        />
      </Field>

      <Field label="City" error={errors?.city}>
        <input
          required
          value={value.city}
          onChange={(e) => set("city", e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 group-data-[error=true]/field:ring-2 group-data-[error=true]/field:ring-red-500"
          autoComplete="address-level2"
        />
      </Field>

      <Field label="State" error={errors?.state}>
        <input
          required
          value={value.state}
          onChange={(e) => set("state", e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 group-data-[error=true]/field:ring-2 group-data-[error=true]/field:ring-red-500"
          autoComplete="address-level1"
        />
      </Field>

      <Field label="PIN code (6 digits)" error={errors?.postalCode}>
        <input
          required
          inputMode="numeric"
          maxLength={6}
          value={value.postalCode}
          onChange={(e) => set("postalCode", e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 group-data-[error=true]/field:ring-2 group-data-[error=true]/field:ring-red-500"
          autoComplete="postal-code"
        />
      </Field>

      <Field label="Country">
        <select
          value={value.country}
          onChange={(e) => set("country", e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 group-data-[error=true]/field:ring-2 group-data-[error=true]/field:ring-red-500"
        >
          <option value="IN">India</option>
        </select>
      </Field>
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      data-error={error ? "true" : undefined}
      className={`group/field flex flex-col gap-2 ${className ?? ""}`}
    >
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error && <span className="text-sm font-medium text-red-600">{error}</span>}
    </label>
  );
}
