"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { LoadingState } from "@/components/LoadingState";
import { api, errorText } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
type MarketPlayer = {
  id: number;
  shortName: string;
  overall: number;
  potential: number;
  age: number | null;
  positions: string[];
  clubName: string | null;
  nationality: string | null;
  price: number;
};

type AuctionItem = {
  id: number;
  minBid: number;
  currentBid: number | null;
  endsAt: string | null;
  player: { id: number; shortName: string; overall: number; positions: string[]; clubName: string | null };
};

type MarketResponse = {
  page: number;
  pages: number;
  total: number;
  balance: number;
  players: MarketPlayer[];
  auctions: AuctionItem[];
};

type SellPlayer = {
  id: string;
  name: string;
  overall: number;
  position: string;
  price: number;
  basePlayer: { shortName: string };
};

type MyRosterResponse = { players: SellPlayer[]; balance: number };

export default function TransfersPage() {
  const { team } = useAuth();
  const canTransfer = Boolean(team?.userId);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const market = useFetch<MarketResponse>(`/transfers/market?q=${encodeURIComponent(query)}&page=${page}&limit=12&ts=${refreshTick}`);
  const roster = useFetch<MyRosterResponse>(canTransfer ? `/transfers/mine?ts=${refreshTick}` : null);

  function refreshMarket() {
    setRefreshTick((current) => current + 1);
  }

  async function performAction(key: string, path: string, body: Record<string, unknown>, success: string) {
    setBusy(key);
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      toast.success(success);
      refreshMarket();
    } catch (reason) {
      toast.error(errorText(reason));
    } finally {
      setBusy(null);
    }
  }

  const availablePlayers = market.data?.players ?? [];
  const auctions = market.data?.auctions ?? [];
  const ownPlayers = roster.data?.players ?? [];

  return (
    <div className="grid gap-7">
      <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Mercado oficial</p>
        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold md:text-5xl">Transferências</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">Contrata jogadores do banco, vende atletas do teu plantel ou disputa um leilão.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Saldo disponível</p>
            <p className="font-display text-3xl font-bold text-amber-300">{canTransfer ? (market.data?.balance ?? roster.data?.balance ?? "—") : "—"} pts</p>
          </div>
        </div>
      </header>

      {!canTransfer && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Podes consultar o mercado, mas para comprar, vender ou licitar precisas de criar uma equipa própria.
        </p>
      )}
      <section className="grid gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Contratações</p>
            <h2 className="font-display text-3xl font-bold text-turf-dark">Jogadores disponíveis</h2>
          </div>
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Pesquisar jogador ou clube"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 md:max-w-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {market.loading && !market.data ? <LoadingState label="A consultar o mercado..." /> : null}
        {!market.loading && availablePlayers.length === 0 && <p className="text-sm text-slate-500">Não foram encontrados jogadores disponíveis.</p>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {availablePlayers.map((player) => (
            <article key={player.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{player.positions.join(" / ")}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{player.shortName}</h3>
                  <p className="text-sm text-slate-500">{player.clubName ?? "Sem clube"} · {player.age ?? "-"} anos</p>
                </div>
                <span className="rounded-xl bg-turf/10 px-3 py-2 font-display text-2xl font-bold text-turf-dark">{player.overall}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                <span className="text-sm text-slate-500">Potencial {player.potential}</span>
                <span className="font-semibold text-amber-600 dark:text-amber-300">{player.price} pts</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={!canTransfer || busy === `buy-${player.id}`}
                  onClick={() => performAction(`buy-${player.id}`, "/transfers/buy", { basePlayerId: player.id }, `${player.shortName} contratado.`)}
                  className="flex-1 rounded-lg bg-turf-dark px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy === `buy-${player.id}` ? "A contratar..." : "Comprar"}
                </button>
                <button
                  type="button"
                  disabled={!canTransfer || busy === `auction-${player.id}`}
                  onClick={() => performAction(`auction-${player.id}`, "/transfers/auctions", { basePlayerId: player.id }, `Leilão criado para ${player.shortName}.`)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-100"
                >
                  Leiloar
                </button>
              </div>
            </article>
          ))}
        </div>

        {market.data && market.data.pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700">Anterior</button>
            <span className="text-sm text-slate-500">Página {page} de {market.data.pages}</span>
            <button type="button" disabled={page >= market.data.pages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700">Seguinte</button>
          </div>
        )}
      </section>

      <section className="grid gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Competição</p>
          <h2 className="font-display text-3xl font-bold text-turf-dark">Leilões abertos</h2>
        </div>
        {auctions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700">Não há leilões abertos de momento.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} canTransfer={canTransfer} busy={busy} onBid={(amount) => performAction(`bid-${auction.id}`, `/transfers/auctions/${auction.id}/bids`, { amount }, "Lance registado.")} />
            ))}
          </div>
        )}
      </section>

      {canTransfer && (
        <section className="grid gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">O teu plantel</p>
            <h2 className="font-display text-3xl font-bold text-turf-dark">Venda de jogadores</h2>
          </div>
          {roster.loading && !roster.data ? <LoadingState label="A carregar o teu plantel..." compact /> : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ownPlayers.map((player) => (
              <article key={player.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{player.name}</h3>
                  <p className="text-sm text-slate-500">{player.position} · OVR {player.overall}</p>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">Recebes {player.price} pts</p>
                </div>
                <button
                  type="button"
                  disabled={busy === `sell-${player.id}`}
                  onClick={() => performAction(`sell-${player.id}`, "/transfers/sell", { teamPlayerId: player.id }, `${player.name} vendido por ${player.price} pontos.`)}
                  className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy === `sell-${player.id}` ? "A vender..." : "Vender"}
                </button>
              </article>
            ))}
          </div>
          {roster.data && ownPlayers.length === 0 && <p className="text-sm text-slate-500">Não tens jogadores disponíveis para venda.</p>}
        </section>
      )}
    </div>
  );
}

function AuctionCard({ auction, canTransfer, busy, onBid }: {
  auction: AuctionItem;
  canTransfer: boolean;
  busy: string | null;
  onBid: (amount: number) => void;
}) {
  const suggestedBid = Math.max(auction.minBid, (auction.currentBid ?? 0) + 1);
  const [amount, setAmount] = useState(suggestedBid);

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{auction.player.positions.join(" / ")}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{auction.player.shortName}</h3>
          <p className="text-sm text-slate-500">{auction.player.clubName ?? "Sem clube"} · OVR {auction.player.overall}</p>
        </div>
        <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-100">{auction.currentBid ?? auction.minBid} pts</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">Termina: {auction.endsAt ? new Date(auction.endsAt).toLocaleString("pt-PT") : "sem prazo"}</p>
      <div className="mt-4 flex gap-2">
        <input aria-label="Valor do lance" type="number" min={suggestedBid} value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
        <button type="button" disabled={!canTransfer || busy === `bid-${auction.id}`} onClick={() => onBid(amount)} className="flex-1 rounded-lg bg-turf-dark px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Dar lance</button>
      </div>
    </article>
  );
}
