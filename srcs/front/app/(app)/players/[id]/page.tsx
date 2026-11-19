"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { useFetch } from "@/lib/useFetch";
import { tier } from "@/lib/tier";
import type { PlayerDetail } from "@/lib/types";

const GROUPS: Record<string, { title: string; attrs: Record<string, string> }> = {
  attacking: { title: "Ataque", attrs: { crossing: "Cruzamento", finishing: "Finalização", headingAccuracy: "Jogo de cabeça", shortPassing: "Passe curto", volleys: "Voleios" } },
  skill: { title: "Habilidade", attrs: { dribbling: "Drible", curve: "Efeito", fkAccuracy: "Livres", longPassing: "Passe longo", ballControl: "Controlo de bola" } },
  movement: { title: "Movimento", attrs: { acceleration: "Aceleração", sprintSpeed: "Velocidade", agility: "Agilidade", reactions: "Reações", balance: "Equilíbrio" } },
  power: { title: "Potência", attrs: { shotPower: "Força de remate", jumping: "Impulsão", stamina: "Resistência", strength: "Força", longShots: "Remates de longe" } },
  mentality: { title: "Mentalidade", attrs: { aggression: "Agressividade", interceptions: "Interceções", positioning: "Posicionamento", vision: "Visão", penalties: "Penáltis", composure: "Compostura" } },
  defending: { title: "Defesa", attrs: { markingAwareness: "Marcação", standingTackle: "Desarme", slidingTackle: "Carrinho" } },
  goalkeeping: { title: "Guarda-redes", attrs: { diving: "Mergulho", handling: "Jogo de mãos", kicking: "Pontapé", positioning: "Posicionamento", reflexes: "Reflexos" } },
};

const FACE: [keyof PlayerDetail["faceStats"], string][] = [
  ["pace", "Ritmo"], ["shooting", "Remate"], ["passing", "Passe"],
  ["dribbling", "Drible"], ["defending", "Defesa"], ["physic", "Físico"],
];

function barColor(v: number) {
  return v >= 75 ? "bg-turf" : v >= 55 ? "bg-gold" : "bg-danger";
}

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useFetch<{ player: PlayerDetail }>(`/players/${id}`);

  if (loading) return <p className="text-muted">A carregar...</p>;
  if (!data) return <p className="text-muted">Jogador não encontrado.</p>;

  const p = data.player;
  const isGK = p.positions.includes("GK");
  const radar = isGK
    ? Object.entries(GROUPS.goalkeeping.attrs).map(([k, label]) => ({ label, value: p.attrGroups.goalkeeping?.[k] ?? 0 }))
    : FACE.map(([k, label]) => ({ label, value: p.faceStats[k] ?? 0 }));
  const groups = isGK ? ["goalkeeping", "movement", "mentality", "skill"] : ["attacking", "skill", "movement", "power", "mentality", "defending"];
  const bestPositions = Object.entries(p.positionRatings).filter(([, v]) => v !== null).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 5);

  return (
    <div className="grid gap-8">
      <Link href="/players" className="text-sm font-semibold text-turf underline">Voltar aos jogadores</Link>

      <section className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <div className={`card-${tier(p.overall)} grid content-start gap-2 rounded-lg p-5`}>
          <div className="flex items-end gap-3">
            <span className="font-display text-7xl font-bold leading-none">{p.overall}</span>
            <span className="font-display text-2xl font-medium">{p.positions.join(", ")}</span>
          </div>
          <h1 className="text-xl font-semibold">{p.longName}</h1>
          <p className="text-sm opacity-80">{p.clubName ?? "Sem clube"}</p>
          <p className="text-sm opacity-80">{p.nationality}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-current/20 pt-3 text-sm">
            <dt className="opacity-75">Potencial</dt><dd className="font-semibold">{p.potential}</dd>
            <dt className="opacity-75">Idade</dt><dd className="font-semibold">{p.age ?? "-"}</dd>
            <dt className="opacity-75">Altura</dt><dd className="font-semibold">{p.heightCm ? `${p.heightCm} cm` : "-"}</dd>
            <dt className="opacity-75">Pé</dt><dd className="font-semibold">{p.preferredFoot ?? "-"}</dd>
            <dt className="opacity-75">Pé fraco</dt><dd className="font-semibold">{p.weakFoot ?? "-"} de 5</dd>
            <dt className="opacity-75">Truques</dt><dd className="font-semibold">{p.skillMoves ?? "-"} de 5</dd>
          </dl>
        </div>

        <div className="grid gap-4 rounded-lg border border-line bg-paper p-4 lg:grid-cols-[1fr_14rem]">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid stroke="#d3dad6" />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 12, fill: "#14211f" }} />
                <Radar dataKey="value" stroke="#1e6b4b" fill="#1e6b4b" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl font-bold">Melhores posições</h2>
            <ul className="grid gap-1 text-sm">
              {bestPositions.map(([pos, v]) => (
                <li key={pos} className="flex justify-between border-b border-line pb-1 last:border-0">
                  <span>{pos.toUpperCase()}</span><span className="font-semibold">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g} className="rounded-lg border border-line bg-paper p-4">
            <h2 className="mb-3 font-display text-xl font-bold">{GROUPS[g].title}</h2>
            <ul className="grid gap-2">
              {Object.entries(GROUPS[g].attrs).map(([key, label]) => {
                const v = p.attrGroups[g]?.[key] ?? 0;
                return (
                  <li key={key} className="text-sm">
                    <div className="flex justify-between"><span>{label}</span><span className="font-semibold">{v}</span></div>
                    <div className="h-1.5 rounded bg-line"><div className={`h-full rounded ${barColor(v)}`} style={{ width: `${v}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
