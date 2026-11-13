import Link from "next/link";
import type { PlayerListItem } from "@/lib/types";
import { tier } from "@/lib/tier";

const STATS: [keyof PlayerListItem["faceStats"], string][] = [
  ["pace", "RIT"], ["shooting", "CHU"], ["passing", "PAS"],
  ["dribbling", "DRI"], ["defending", "DEF"], ["physic", "FIS"],
];

export function PlayerCard({ p }: { p: PlayerListItem }) {
  const isGK = p.faceStats.pace === null;
  return (
    <Link href={`/players/${p.id}`} className={`card-${tier(p.overall)} block rounded-lg p-3 shadow-sm`}>
      <div className="flex gap-3">
        <div className="text-center">
          <div className="font-display text-5xl font-bold leading-none">{p.overall}</div>
          <div className="font-display text-lg font-medium">{p.positions[0]}</div>
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{p.shortName}</div>
          <div className="truncate text-xs opacity-75">{p.clubName ?? "Sem clube"}</div>
          <div className="truncate text-xs opacity-75">{p.nationality}</div>
        </div>
      </div>
      <div className="mt-3 border-t border-current/20 pt-2">
        {isGK ? (
          <div className="text-xs opacity-75">Guarda-redes: pot. {p.potential}</div>
        ) : (
          <div className="grid grid-cols-6 text-center">
            {STATS.map(([key, label]) => (
              <div key={key}>
                <div className="font-display text-lg font-bold leading-none">{p.faceStats[key]}</div>
                <div className="text-[10px] opacity-75">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
