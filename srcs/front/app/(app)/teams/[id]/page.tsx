"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { LoadingState } from "@/components/LoadingState";
import { useFetch } from "@/lib/useFetch";
import type { Team } from "@/lib/types";

type TeamDetailPayload = {
  team: Team;
  players: Array<{
    id: string;
    displayName?: string | null;
    position: string;
    overall: number;
    basePlayer: {
      shortName: string;
      longName: string;
      age: number | null;
      overall: number;
      clubName: string | null;
      nationality: string | null;
    };
  }>;
};

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const { team: currentTeam } = useAuth();
  const { data, loading, error } = useFetch<TeamDetailPayload>(`/teams/${params.id}`);

  if (loading && !data) return <LoadingState label="A preparar a equipa..." compact />;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data?.team) return <p className="text-slate-500">Equipa não encontrada.</p>;

  const team = data.team;
  const players = data.players ?? [];
  const isCurrentTeam = currentTeam?.id === team.id;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Equipa</p>
          <h1 className="font-display text-4xl font-bold text-turf-dark">{team.name}</h1>
        </div>
        <Link href="/teams" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-100">
          Voltar
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Overall</p>
          <p className="mt-3 font-display text-4xl font-bold text-turf-dark">{team.overall ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Jogadores</p>
          <p className="mt-3 font-display text-4xl font-bold text-turf-dark">{players.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Estádio</p>
          <p className="mt-3 text-lg font-semibold text-slate-800 dark:text-slate-100">{team.stadium ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Liga</p>
          <p className="mt-3 text-lg font-semibold text-slate-800 dark:text-slate-100">{team.league ?? "-"}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-turf-dark">Plantel</h2>
          {isCurrentTeam && <span className="rounded-full bg-turf/10 px-2.5 py-1 text-xs font-semibold text-turf-dark">A tua equipa</span>}
        </div>

        {players.length === 0 ? (
          <p className="text-slate-500">Ainda não há jogadores registados para esta equipa.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {players.map((player) => (
              <div key={player.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-3xl font-bold text-turf-dark">{player.overall}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-800">{player.position}</span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-800 dark:text-slate-100">{player.displayName ?? player.basePlayer.shortName}</h3>
                <p className="text-sm text-slate-500">{player.basePlayer.clubName ?? "Clube"} · {player.basePlayer.age ?? "-"} anos</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}