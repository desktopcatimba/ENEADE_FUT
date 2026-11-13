"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { LoadingState } from "@/components/LoadingState";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/myteam", label: "Meu Team" },
  { href: "/players", label: "Jogadores" },
  { href: "/teams", label: "Equipas" },
  { href: "/transfers", label: "Transferências" },
  { href: "/profile", label: "Perfil" },
  { href: "/settings", label: "Configurações" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, team } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <LoadingState label="A autenticar sessão..." />;

  return (
    <div className="min-h-screen w-full bg-[var(--bg-page)] text-[var(--text-main)]">
      <header className="border-b border-[var(--border-soft)] bg-[var(--bg-panel)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">ENEADE FUT</p>
            <h1 className="font-display text-2xl font-bold text-turf-dark">Liga</h1>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium dark:bg-slate-800 dark:text-slate-200">
              {team?.name ?? "Sem equipa"}
            </span>
            <button
              onClick={async () => { await logout(); router.replace("/login"); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1700px] gap-6 p-4 lg:grid-cols-[260px_1fr] lg:p-6">
        <aside className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-panel)] p-4 shadow-sm">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Menu</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-turf-dark">Gestão</h2>
          </div>

          <nav className="grid gap-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  pathname.startsWith(l.href)
                    ? "bg-turf-dark text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Conta</p>
            <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
            <p className="mt-1 text-xs text-slate-500">{user.email}</p>
          </div>
        </aside>

        <main className="min-h-[70vh] rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-panel)] p-5 shadow-sm sm:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
