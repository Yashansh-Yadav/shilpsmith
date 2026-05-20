"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("admin-credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!res) {
      toast.error("Login failed");
      return;
    }
    if (res.error) {
      toast.error(res.error === "CredentialsSignin" ? "Invalid email or password" : res.error);
      return;
    }

    toast.success("Signed in");
    router.replace(res.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-md">
      <h1 className="text-2xl font-bold mb-1">Admin Sign In</h1>
      <p className="text-sm text-slate-500 mb-6">Access the ShilpSmith admin panel.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="border rounded-xl px-4 py-3"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="border rounded-xl px-4 py-3"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded-xl py-3 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Toaster />
      <Suspense fallback={<div>Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
