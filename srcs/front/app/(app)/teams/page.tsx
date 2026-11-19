"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { LoadingState } from "@/components/LoadingState";
import { api, errorText } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Team, TeamListPage } from "@/lib/types";

export default function TeamsPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const { refresh } = useAuth();
  const { data, loading } = useFetch<TeamListPage>(`/teams?page=${page}&limit=12&q=${encodeURIComponent(q)}`);

  const totalPages = useMemo(() => Math.max(1, data?.pages ?? 1), [data?.pages]);

  async function selectTeam(teamId: string) {
    setBusy(teamId);
    try {
      await api("/teams/select", { method: "POST", body: JSON.stringify({ teamId }) });
      await refresh();
      toast.success("Equipa selecionada.");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  const teams = data?.teams ?? [];

  function handleSearch(value: string) {
    setQ(value);
    setPage(1);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Equipas</p>
          <h1 className="font-display text-4xl font-bold text-turf-dark">Catálogo</h1>
        </div>
        <input
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Pesquisar equipa"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {loading && !data && <LoadingState label="A procurar equipas..." compact />}

      {!loading && teams.length === 0 && (<p className="text-slate-500">Nenhuma equipa encontrada para esta pesquisa.</p>)}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => (
          <article key={`${team.id}-${team.name}`} className="flex min-h-[180px] flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-full bg-turf/10 px-2.5 py-1 text-xs font-semibold text-turf-dark">Overall {team.overall ?? "-"}</span>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{team.league ?? "Liga"}</span>
              </div>
              <Link href={`/teams/${team.id}`} className="text-xl font-bold text-slate-800 hover:underline dark:text-slate-100">{team.name}</Link>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{team.nationality ?? "Nacionalidade"}</p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">{team.stadium ?? "Estádio"}</span>
              <div className="flex gap-2">
                <Link href={`/teams/${team.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-100">
                  Ver
                </Link>
                <button
                  className="rounded-lg bg-turf-dark px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={() => selectTeam(team.id)}
                  disabled={busy === team.id}
                >
                  {busy === team.id ? "A selecionar..." : "Selecionar"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700">
            Anterior
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-300">Página {page} / {totalPages}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700">
            Seguinte
          </button>
        </div>
      )}
    </div>
  );
}
