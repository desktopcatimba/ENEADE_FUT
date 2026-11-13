"use client";
import Link from "next/link";
import { useState } from "react";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useFetch } from "@/lib/useFetch";
import { LoadingState } from "@/components/LoadingState";
import type { LedgerEntry, Team, TeamPlayerSummary } from "@/lib/types";

const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "5-3-2", "4-1-4-1", "4-5-1"];

const LEDGER_LABEL: Record<string, string> = {
  INITIAL: "Pontos iniciais", MATCH: "Jogo", PRIZE_PLACE: "Prémio de classificação",
  PRIZE_INDIVIDUAL: "Prémio individual", UPGRADE: "Evolução", BUY: "Contratação", SELL: "Venda",
  AUCTION: "Leilão", POSITION_CHANGE: "Troca de posição", ADJUSTMENT: "Ajuste",
};

export default function DashboardPage() {
  const { team, refresh } = useAuth();
  return team ? <TeamView team={team} onChange={refresh} /> : <CreateOrSelectTeam onCreated={refresh} />;
}

function CreateOrSelectTeam({ onCreated }: { onCreated: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const { data, loading } = useFetch<{ teams: Team[]; total: number }>("/teams/catalog");

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError(null);
    try {
      await api("/teams", { method: "POST", body: JSON.stringify(form) });
      await onCreated();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function selectTeam(teamId: string) {
    setBusy(true);
    setError(null);
    try {
      await api("/teams/select", { method: "POST", body: JSON.stringify({ teamId }) });
      await onCreated();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const filtered = (data?.teams ?? []).filter((team) =>
    `${team.name} ${team.league ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="grid gap-8">
      <div className="rounded-2xl bg-gradient-to-r from-[#0f172a] to-[#1e293b] p-6 text-white">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Dashboard</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Ainda não tens equipa ativa</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Selecciona uma equipa ou cria a tua para começar o resumo do teu plantel e avaliações.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onCreate} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-display text-2xl font-bold text-turf-dark">Criar equipa</h2>
          <label className="grid gap-1 text-sm">
            Nome da equipa
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" name="name" required minLength={2} maxLength={40} />
          </label>
          <label className="grid gap-1 text-sm">
            Formação
            <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" name="formation" defaultValue="4-3-3">
              {FORMATIONS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button className="rounded-lg bg-turf-dark px-4 py-2 font-semibold text-white hover:opacity-95" disabled={busy}>
            {busy ? "A criar..." : "Criar equipa"}
          </button>
        </form>

        <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-display text-2xl font-bold text-turf-dark">Selecionar equipa</h2>
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Pesquisar equipa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading ? <LoadingState label="A carregar equipas..." compact /> : (
            <div className="grid max-h-[360px] gap-2 overflow-auto pr-1">
              {filtered.slice(0, 20).map((team) => (
                <button
                  key={`${team.id}-${team.name}`}
                  type="button"
                  onClick={() => selectTeam(team.id)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950"
                >
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{team.name}</p>
                    <p className="text-xs text-slate-500">{team.league ?? "Liga"}</p>
                  </div>
                  <span className="text-xs font-semibold text-turf-dark">{team.overall ?? "-"}</span>
                </button>
              ))}
            </div>
          )}
          <Link href="/teams" className="text-sm font-medium text-turf-dark underline underline-offset-4">
            Ver todas as equipas
          </Link>
        </div>
      </div>
    </div>
  );
}

function TeamView({ team, onChange }: { team: Team; onChange: () => Promise<void> }) {
  const [refreshTick, setRefreshTick] = useState(0);
  const isOwnedTeam = Boolean(team.userId);
  const me = useFetch<{ team: Team; points: number }>("/teams/me");
  const ledger = useFetch<{ balance: number; entries: LedgerEntry[] }>("/teams/me/ledger");
  const players = useFetch<{ team: Team | null; players: TeamPlayerSummary[] }>(`/teams/me/players?ts=${refreshTick}`);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Partial<Team>) {
    setError(null);
    try {
      await api("/teams/me", { method: "PATCH", body: JSON.stringify(body) });
      await onChange();
    } catch (err) {
      setError(errorText(err));
    }
  }

  const topPlayers = [...(players.data?.players ?? [])].sort((a, b) => b.overall - a.overall).slice(0, 5);
  const youngest = [...(players.data?.players ?? [])].sort((a, b) => (a.basePlayer.age ?? 99) - (b.basePlayer.age ?? 99))[0];
  const oldest = [...(players.data?.players ?? [])].sort((a, b) => (b.basePlayer.age ?? 0) - (a.basePlayer.age ?? 0))[0];
  const teamOverall = players.data?.players.length
    ? Math.round(players.data.players.reduce((sum, p) => sum + p.overall, 0) / players.data.players.length)
    : team.overall ?? 0;

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">A tua equipa</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-turf-dark">{team.name}</h1>
        </div>
        <Link href="/myteam" className="rounded-lg bg-turf-dark px-4 py-2 text-sm font-semibold text-white">
          Ver o plantel
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Overall</p>
          <p className="mt-3 font-display text-4xl font-bold text-turf-dark">{teamOverall}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Jogadores</p>
          <p className="mt-3 font-display text-4xl font-bold text-turf-dark">{players.data?.players.length ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mais jovem</p>
          <p className="mt-3 font-display text-3xl font-bold text-turf-dark">{youngest ? youngest.displayName ?? youngest.basePlayer.shortName : "-"}</p>
          <p className="text-sm text-slate-500">{youngest ? `${youngest.basePlayer.age ?? "-"} anos` : "Sem dados"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mais velho</p>
          <p className="mt-3 font-display text-3xl font-bold text-turf-dark">{oldest ? oldest.displayName ?? oldest.basePlayer.shortName : "-"}</p>
          <p className="text-sm text-slate-500">{oldest ? `${oldest.basePlayer.age ?? "-"} anos` : "Sem dados"}</p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-turf-dark">Melhores jogadores</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Top 5</span>
          </div>

          {players.loading ? <LoadingState label="A preparar o resumo do plantel..." compact /> : topPlayers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              Ainda não tens jogadores no plantel. Selecciona uma equipa para começar.
            </div>
          ) : (
            <div className="grid gap-4">
              {topPlayers.map((player) => (
                <div key={`${player.id}-${player.basePlayer.id}`}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{player.displayName ?? player.basePlayer.shortName}</span>
                    <span className="rounded-full bg-turf/10 px-2 py-0.5 text-xs font-semibold text-turf-dark">{player.overall}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-turf to-emerald-400" style={{ width: `${Math.min((player.overall / 99) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="grid gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Pontos</p>
            <p className="mt-2 font-display text-5xl font-bold text-yellow-500">{me.data?.points ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-500">Bónus inicial: 50</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 font-display text-xl font-bold text-turf-dark">Extrato</h2>
            {ledger.loading && <p className="text-sm text-slate-500">A carregar...</p>}
            {ledger.error && <p className="text-sm text-red-600">{ledger.error}</p>}
            {ledger.data?.entries.length === 0 && <p className="text-sm text-slate-500">Ainda sem movimentos.</p>}
            <ul className="grid gap-2">
              {ledger.data?.entries.map((e) => (
                <li key={`${e.id}-${e.type}`} className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 text-sm last:border-none dark:border-slate-700">
                  <span>{e.description ?? LEDGER_LABEL[e.type] ?? e.type}</span>
                  <span className={e.amount >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                    {e.amount > 0 ? "+" : ""}{e.amount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-2">
        {isOwnedTeam ? (
          <label className="grid gap-1 text-sm">
            Nome
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" defaultValue={team.name} maxLength={40}
              onBlur={(e) => { const v = e.target.value.trim(); if (v.length >= 2 && v !== team.name) patch({ name: v }); }} />
          </label>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
            Esta equipa foi selecionada do catálogo e não pode ter o nome alterado.
          </div>
        )}
        {isOwnedTeam ? (
          <label className="grid gap-1 text-sm">
            Formação
            <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={team.formation} onChange={(e) => patch({ formation: e.target.value })}>
              {FORMATIONS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
            Esta formação pertence à equipa do catálogo e não pode ser alterada.
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
