"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail } from "@/lib/auth/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: loginError } = await loginWithEmail(email, password);

    if (loginError) {
      setError("No se pudo iniciar sesion. Verifica tus credenciales.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/admin/jugadores");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
        <h1 className="text-3xl font-bold">Login</h1>
        <p className="mt-2 text-zinc-300">Ingresa con tu usuario administrador.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-400"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-zinc-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-400"
              required
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Iniciar sesion"}
          </button>
        </form>
      </section>
    </main>
  );
}
