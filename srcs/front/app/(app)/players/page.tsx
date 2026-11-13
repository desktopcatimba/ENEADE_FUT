"use client";
import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { PlayerCard } from "@/components/PlayerCard";
import { useFetch } from "@/lib/useFetch";
import type { PlayersPage } from "@/lib/types";

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST"];

export default function PlayersPage() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [position, setPosition] = useState("");
  const [minOverall, setMinOverall] = useState("");
  const [fifaVersion, setFifaVersion] = useState("24");
  const [sort, setSort] = useState("overall");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ fifaVersion, sort, page: String(page), limit: "24" });
  if (dq) params.set("q", dq);
  if (position) params.set("position", position);
  if (minOverall) params.set("minOverall", minOverall);

  const { data, error, loading } = useFetch<PlayersPage>(`/players?${params}`);
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-4xl font-bold text-turf-dark">Jogadores</h1>

      <div className="grid gap-3 rounded-lg border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input className="input lg:col-span-2" placeholder="Pesquisar por nome" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Pesquisar por nome" />
        <select className="input" value={position} onChange={(e) => reset(setPosition)(e.target.value)} aria-label="Posição">
          <option value="">Todas as posições</option>
          {POSITIONS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="input" value={minOverall} onChange={(e) => reset(setMinOverall)(e.target.value)} aria-label="Overall mínimo">
          <option value="">Qualquer overall</option>
          {[90, 86, 80, 75, 70, 60].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>
        <div className="flex gap-2">
          <select className="input" value={fifaVersion} onChange={(e) => reset(setFifaVersion)(e.target.value)} aria-label="Versão do jogo">
            <option value="24">FIFA 24</option>
            <option value="23">FIFA 23</option>
          </select>
          <select className="input" value={sort} onChange={(e) => reset(setSort)(e.target.value)} aria-label="Ordenar por">
            <option value="overall">Overall</option>
            <option value="potential">Potencial</option>
            <option value="age">Idade</option>
            <option value="name">Nome</option>
          </select>
        </div>
      </div>

      {error && <p role="alert" className="text-danger">{error}</p>}
      {loading && !data && <LoadingState label="A carregar jogadores..." compact />}
      {data && data.players.length === 0 && <p className="text-muted">Nenhum jogador encontrado. Tenta outro nome ou limpa os filtros.</p>}

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
        {data?.players.map((p) => <PlayerCard key={`${p.id}-${p.fifaVersion}`} p={p} />)}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="text-sm text-muted">Página {data.page} de {data.pages} ({data.total} jogadores)</span>
          <button className="btn" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Seguinte</button>
        </div>
      )}
    </div>
  );
}
