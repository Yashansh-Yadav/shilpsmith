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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Full name" error={errors?.fullName} className="sm:col-span-2">
        <input
          required
          value={value.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3"
          autoComplete="name"
        />
      </Field>

      <Field label="Phone (10-digit)" error={errors?.phone}>
        <input
          required
          inputMode="numeric"
          value={value.phone}
          onChange={(e) => set("phone", e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3"
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
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            autoComplete="email"
          />
        </Field>
      )}

      <Field label="Street address" error={errors?.street} className="sm:col-span-2">
        <input
          required
          value={value.street}
          onChange={(e) => set("street", e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3"
          autoComplete="street-address"
        />
      </Field>

      <Field label="City" error={errors?.city}>
        <input
          required
          value={value.city}
          onChange={(e) => set("city", e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3"
          autoComplete="address-level2"
        />
      </Field>

      <Field label="State" error={errors?.state}>
        <input
          required
          value={value.state}
          onChange={(e) => set("state", e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3"
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
          className="w-full rounded-xl border border-slate-200 px-4 py-3"
          autoComplete="postal-code"
        />
      </Field>

      <Field label="Country">
        <select
          value={value.country}
          onChange={(e) => set("country", e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3"
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
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
