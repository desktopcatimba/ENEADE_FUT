"use client";

import { useState } from "react";
import { useFetch } from "@/lib/useFetch";

type Coach = {
  id: string;
  name: string;
  nationality: string | null;
  teamName: string | null;
  faceUrl: string | null;
};

export default function CoachesPage() {
  const [q, setQ] = useState("");
  const { data, error, loading } = useFetch<{ coaches: Coach[]; total: number }>("/coaches");
  const coaches = (data?.coaches ?? []).filter((coach) => `${coach.name} ${coach.teamName ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Treinadores</p>
          <h1 className="font-display text-4xl font-bold text-turf-dark">Lista</h1>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar treinador"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2"
        />
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {loading && !data && <p className="text-slate-500">A carregar treinadores...</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {coaches.map((coach) => (
          <div key={coach.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-lg font-bold text-slate-800">{coach.name}</p>
            <p className="mt-1 text-sm text-slate-600">{coach.teamName ?? "Sem equipa"}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">{coach.nationality ?? "Nacionalidade"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
