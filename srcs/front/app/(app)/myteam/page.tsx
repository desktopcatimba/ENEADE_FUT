"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { LoadingState } from "@/components/LoadingState";
import { api, errorText } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Team, TeamPlayerSummary } from "@/lib/types";

const POSITIONS = ["GK", "RB", "CB", "LB", "CDM", "CM", "CAM", "RW", "LW", "ST"];

export default function MyTeamPage() {
  const { team } = useAuth();
  const canEdit = Boolean(team?.userId);
  const [refreshTick, setRefreshTick] = useState(0);
  const { data, loading, error } = useFetch<{ team: Team | null; players: TeamPlayerSummary[] }>(
    team ? `/teams/me/players?ts=${refreshTick}` : null,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPlayer = useMemo(
    () => (data?.players ?? []).find((player) => player.id === selectedId) ?? null,
    [data?.players, selectedId],
  );

  useEffect(() => {
    if (!selectedId && data?.players?.[0]) setSelectedId(data.players[0].id);
  }, [data?.players, selectedId]);

  if (!team) {
    return (
      <div className="grid gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Meu Team</p>
          <h1 className="font-display text-4xl font-bold text-turf-dark">Ainda não tens equipa selecionada</h1>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900">
          Cria a tua equipa ou seleciona uma equipa do catálogo para consultar o respetivo plantel.
        </div>
        <Link href="/dashboard" className="inline-flex w-fit rounded-lg bg-turf-dark px-4 py-2 font-semibold text-white">
          Ir para dashboard
        </Link>
      </div>
    );
  }

  if (loading && !data) return <LoadingState label="A preparar o plantel..." />;
  if (error) return <p className="text-red-600">{error}</p>;

  const players = data?.players ?? [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Meu Team</p>
          <h1 className="font-display text-4xl font-bold text-turf-dark">{team.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">Formação {team.formation}</span>
          <span className="rounded-full bg-turf/10 px-3 py-1.5 text-turf-dark">{players.length} jogadores</span>
          {!canEdit && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">Equipa do catálogo · só consulta</span>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="grid gap-4">
          {players.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900">
              O teu plantel ainda está vazio. Vai para a dashboard para selecionar ou criar uma equipa.
            </div>
          ) : (
            players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedId(player.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedPlayer?.id === player.id
                    ? "border-turf bg-turf/5"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-3xl font-bold text-turf-dark">{player.overall}</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{player.displayName ?? player.basePlayer.shortName}</p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.18em] text-slate-500">
                    <p>{player.position}</p>
                    <p>{player.basePlayer.age ?? "-"} anos</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
          {!selectedPlayer ? (
            <p className="text-slate-500">Seleciona um jogador para ver os detalhes.</p>
          ) : !canEdit ? (
            <div className="grid gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Detalhes do jogador</p>
                <h2 className="font-display text-3xl font-bold text-turf-dark">{selectedPlayer.displayName ?? selectedPlayer.basePlayer.shortName}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p>Overall <strong>{selectedPlayer.overall}</strong></p>
                <p>Posição <strong>{selectedPlayer.position}</strong></p>
                <p>Idade <strong>{selectedPlayer.basePlayer.age ?? "-"}</strong></p>
                <p>Clube <strong>{selectedPlayer.basePlayer.clubName ?? "-"}</strong></p>
              </div>
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                Só podes editar os atributos dos jogadores da tua equipa própria.
              </p>
            </div>
          ) : (
            <PlayerEditor
              player={selectedPlayer}
              onSaved={() => setRefreshTick((tick) => tick + 1)}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function PlayerEditor({ player, onSaved }: { player: TeamPlayerSummary; onSaved: () => void }) {
  const [form, setForm] = useState({
    overall: player.overall,
    position: player.position,
    attrs: { ...player.attrs },
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm({ overall: player.overall, position: player.position, attrs: { ...player.attrs } });
  }, [player]);

  const attrEntries = Object.entries(form.attrs ?? {}).slice(0, 8);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await api(`/teams/me/players/${player.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          overall: Number(form.overall),
          position: form.position,
          attrs: form.attrs,
        }),
      });
      onSaved();
      setMessage("Atributos atualizados.");
    } catch (err) {
      setMessage(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Editar jogador</p>
          <h2 className="font-display text-3xl font-bold text-turf-dark">{player.displayName ?? player.basePlayer.shortName}</h2>
        </div>
        <span className="rounded-full bg-turf/10 px-3 py-1 text-sm font-semibold text-turf-dark">{form.overall}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Overall
          <input
            type="number"
            min={40}
            max={99}
            value={form.overall}
            onChange={(e) => setForm((current) => ({ ...current, overall: Number(e.target.value) }))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="grid gap-1 text-sm">
          Posição
          <select
            value={form.position}
            onChange={(e) => setForm((current) => ({ ...current, position: e.target.value }))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          >
            {POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Atributos principais</p>
        {attrEntries.map(([key, value]) => (
          <label key={key} className="grid gap-1 text-sm">
            <span className="capitalize">{key}</span>
            <input
              type="range"
              min={0}
              max={99}
              value={Number(value ?? 0)}
              onChange={(e) => setForm((current) => ({
                ...current,
                attrs: { ...current.attrs, [key]: Number(e.target.value) },
              }))}
            />
            <span className="text-xs text-slate-500">{Number(value ?? 0)}</span>
          </label>
        ))}
      </div>

      {message && <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-turf-dark px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {saving ? "A guardar..." : "Guardar alterações"}
      </button>
    </div>
  );
}
