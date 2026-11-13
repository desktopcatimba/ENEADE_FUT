"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
      });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-line bg-paper p-6">
      <h2 className="font-display text-2xl font-bold">Entrar</h2>
      <label className="grid gap-1 text-sm">Email
        <input className="input" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="grid gap-1 text-sm">Senha
        <input className="input" name="password" type="password" required autoComplete="current-password" />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "A entrar..." : "Entrar"}</button>
      <p className="text-sm text-muted">Ainda não tens conta? <Link href="/register" className="font-semibold text-turf underline">Criar conta</Link></p>
    </form>
  );
}
