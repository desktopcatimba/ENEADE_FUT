"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function RegisterPage() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError(null);
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify(f) });
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
      <h2 className="font-display text-2xl font-bold">Criar conta</h2>
      <label className="grid gap-1 text-sm">Nome
        <input className="input" name="name" required minLength={2} autoComplete="name" />
      </label>
      <label className="grid gap-1 text-sm">Email
        <input className="input" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="grid gap-1 text-sm">Senha (mínimo 8 caracteres)
        <input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">Data de nascimento
          <input className="input" name="birthDate" type="date" required autoComplete="bday" />
        </label>
        <label className="grid gap-1 text-sm">Telemóvel
          <input className="input" name="phone" type="tel" required placeholder="+244 900 000 000" autoComplete="tel" />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "A criar..." : "Criar conta"}</button>
      <p className="text-sm text-muted">Já tens conta? <Link href="/login" className="font-semibold text-turf underline">Entrar</Link></p>
    </form>
  );
}
