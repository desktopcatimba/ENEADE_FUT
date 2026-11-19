import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError, parse } from "../lib/http";
import { getBalance } from "../lib/points";
import { requireAuth } from "../middleware/auth";

export const transfersRouter = Router();
transfersRouter.use(requireAuth);

const buySchema = z.object({ basePlayerId: z.coerce.number().int().positive() });
const sellSchema = z.object({ teamPlayerId: z.string().min(1) });
const loanSchema = z.object({ basePlayerId: z.coerce.number().int().positive(), days: z.coerce.number().int().min(1).max(30).default(7) });
const auctionSchema = z.object({ basePlayerId: z.coerce.number().int().positive(), minBid: z.coerce.number().int().positive().optional() });
const bidSchema = z.object({ amount: z.coerce.number().int().positive() });

async function ownedTeam(userId: string) {
  const selectedTeamId = (await prisma.user.findUnique({ where: { id: userId }, select: { selectedTeamId: true } }))?.selectedTeamId;
  const team = selectedTeamId
    ? await prisma.team.findFirst({ where: { id: selectedTeamId, userId } })
    : await prisma.team.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!team) throw new HttpError(403, "Cria uma equipa própria para fazer transferências.");
  return team;
}

async function priceFor(overall: number, kind: "buy" | "sell") {
  const tier = await prisma.priceTier.findFirst({
    where: { overall: { lte: overall } },
    orderBy: { overall: "desc" },
  });
  if (!tier) return Math.max(1, Math.ceil((overall - 45) * (kind === "buy" ? 2 : 1)));
  return kind === "buy" ? tier.buyPrice : tier.sellPrice;
}

async function openWindow(tx: Prisma.TransactionClient) {
  let window = await tx.transferWindow.findFirst({
    where: { isOpen: true },
    orderBy: { id: "desc" },
    include: { season: true },
  });
  if (window) return window;

  const latestSeason = await tx.season.findFirst({ orderBy: { number: "desc" } });
  const season = latestSeason && latestSeason.status !== "CLOSED"
    ? latestSeason
    : await tx.season.create({
      data: {
        number: (latestSeason?.number ?? 0) + 1,
        status: "WINDOW",
        fifaVersion: 24,
      },
    });

  window = await tx.transferWindow.create({
    data: { seasonId: season.id, isOpen: true },
    include: { season: true },
  });
  return window;
}

async function releaseExpiredLoans(teamId: string) {
  await prisma.teamPlayer.updateMany({
    where: { teamId, status: "ACTIVE", isLoan: true, loanUntil: { lte: new Date() } },
    data: { status: "RELEASED" },
  });
}

transfersRouter.get("/market", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const position = String(req.query.position ?? "").trim().toUpperCase();
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const limit = Math.min(24, Math.max(1, Number(req.query.limit ?? 12) || 12));
  const where: Prisma.BasePlayerWhereInput = {
    fifaVersion: 24,
    teamPlayers: { none: { status: "ACTIVE", team: { userId: { not: null } } } },
  };
  if (q) {
    where.OR = [
      { shortName: { contains: q, mode: "insensitive" } },
      { longName: { contains: q, mode: "insensitive" } },
      { clubName: { contains: q, mode: "insensitive" } },
    ];
  }
  if (position) where.positions = { has: position };

  const [total, players, auctions, balance] = await Promise.all([
    prisma.basePlayer.count({ where }),
    prisma.basePlayer.findMany({
      where,
      orderBy: [{ overall: "desc" }, { shortName: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        shortName: true,
        overall: true,
        potential: true,
        age: true,
        positions: true,
        clubName: true,
        nationality: true,
      },
    }),
    prisma.auction.findMany({
      where: { status: "OPEN", endsAt: { gt: new Date() } },
      include: {
        basePlayer: { select: { id: true, shortName: true, overall: true, positions: true, clubName: true } },
        bids: { select: { amount: true }, orderBy: { amount: "desc" }, take: 1 },
      },
      orderBy: { endsAt: "asc" },
      take: 30,
    }),
    (async () => {
      const team = await prisma.team.findFirst({ where: { userId: req.user!.id } });
      return team ? getBalance(team.id) : 0;
    })(),
  ]);

  const pricedPlayers = await Promise.all(players.map(async (player) => ({
    ...player,
    price: await priceFor(player.overall, "buy"),
  })));

  res.json({
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    total,
    balance,
    players: pricedPlayers,
    auctions: auctions.map((auction) => ({
      id: auction.id,
      minBid: auction.minBid,
      currentBid: auction.bids[0]?.amount ?? null,
      endsAt: auction.endsAt,
      player: auction.basePlayer,
    })),
  });
});

transfersRouter.get("/mine", async (req, res) => {
  const team = await ownedTeam(req.user!.id);
  await releaseExpiredLoans(team.id);
  const players = await prisma.teamPlayer.findMany({
    where: { teamId: team.id, status: "ACTIVE" },
    include: {
      basePlayer: { select: { id: true, shortName: true, overall: true, positions: true, clubName: true } },
      customPlayer: { select: { id: true, shortName: true, overall: true, positions: true, clubName: true } },
    },
    orderBy: [{ overall: "desc" }, { id: "asc" }],
  });
  const uniquePlayers = [...new Map(players.map((player) => [`${player.customPlayerId ?? player.basePlayerId}`, player])).values()];
  const mappedPlayers = await Promise.all(uniquePlayers.map(async (player) => {
    const profile = player.customPlayer ?? player.basePlayer;
    if (!profile) return null;
    return {
      id: player.id,
      overall: player.overall,
      position: player.position,
      name: player.displayName ?? profile.shortName,
      isLoan: player.isLoan,
      basePlayer: profile,
      price: await priceFor(player.overall, "sell"),
    };
  }));
  res.json({ team, balance: await getBalance(team.id), players: mappedPlayers.filter((player) => player !== null) });
});

transfersRouter.get("/history", async (req, res) => {
  const team = await ownedTeam(req.user!.id);
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20) || 20));
  const type = String(req.query.type ?? "");
  const where: Prisma.TransferRecordWhereInput = { teamId: team.id };
  if (["BUY", "SELL", "LOAN", "AUCTION"].includes(type)) where.type = type as "BUY" | "SELL" | "LOAN" | "AUCTION";
  const [total, records] = await Promise.all([
    prisma.transferRecord.count({ where }),
    prisma.transferRecord.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
  ]);
  res.json({ page, pages: Math.max(1, Math.ceil(total / limit)), total, records });
});

transfersRouter.post("/buy", async (req, res) => {
  const { basePlayerId } = parse(buySchema, req.body);
  const team = await ownedTeam(req.user!.id);

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.basePlayer.findUnique({ where: { id: basePlayerId } });
    if (!player) throw new HttpError(404, "Jogador não encontrado");
    const alreadyOwned = await tx.teamPlayer.findFirst({
      where: { basePlayerId, status: "ACTIVE", team: { userId: { not: null } } },
    });
    if (alreadyOwned) throw new HttpError(409, "Este jogador já pertence a uma equipa.");

    const price = await priceFor(player.overall, "buy");
    const balance = await getBalance(team.id, tx);
    if (balance < price) throw new HttpError(400, "Saldo insuficiente para contratar este jogador.");

    const teamPlayer = await tx.teamPlayer.create({
      data: {
        teamId: team.id,
        basePlayerId: player.id,
        overall: player.overall,
        attrs: player.attrs as Prisma.InputJsonValue,
        position: player.positions[0] ?? "CM",
        acquiredPrice: price,
      },
    });
    await tx.pointsLedger.create({
      data: { teamId: team.id, type: "BUY", amount: -price, description: `Contratação: ${player.shortName}` },
    });
    await tx.transferRecord.create({ data: { teamId: team.id, type: "BUY", playerName: player.shortName, amount: -price, description: "Compra" } });
    return { player: teamPlayer, price, balance: balance - price };
  });

  res.status(201).json(result);
});

transfersRouter.post("/sell", async (req, res) => {
  const { teamPlayerId } = parse(sellSchema, req.body);
  const team = await ownedTeam(req.user!.id);

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.teamPlayer.findFirst({
      where: { id: teamPlayerId, teamId: team.id, status: "ACTIVE" },
      include: { basePlayer: true, customPlayer: true },
    });
    if (!player) throw new HttpError(404, "Jogador ativo não encontrado no teu plantel.");
    if (player.isLoan) throw new HttpError(400, "Um jogador emprestado não pode ser vendido.");
    const price = await priceFor(player.overall, "sell");
    await tx.teamPlayer.update({ where: { id: player.id }, data: { status: "SOLD" } });
    const playerName = player.displayName ?? player.customPlayer?.shortName ?? player.basePlayer?.shortName ?? "Jogador";
    await tx.pointsLedger.create({
      data: { teamId: team.id, type: "SELL", amount: price, description: `Venda: ${playerName}` },
    });
    await tx.transferRecord.create({ data: { teamId: team.id, type: "SELL", playerName, amount: price, description: "Venda" } });
    return { playerId: player.id, price, balance: await getBalance(team.id, tx) };
  });

  res.json(result);
});

transfersRouter.post("/loan", async (req, res) => {
  const { basePlayerId, days } = parse(loanSchema, req.body);
  const team = await ownedTeam(req.user!.id);
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.basePlayer.findUnique({ where: { id: basePlayerId } });
    if (!player) throw new HttpError(404, "Jogador não encontrado");
    const alreadyOwned = await tx.teamPlayer.findFirst({
      where: { basePlayerId, status: "ACTIVE", team: { userId: { not: null } } },
    });
    if (alreadyOwned) throw new HttpError(409, "Este jogador já pertence a uma equipa.");
    const price = Math.max(1, Math.ceil((await priceFor(player.overall, "buy")) / 2));
    const balance = await getBalance(team.id, tx);
    if (balance < price) throw new HttpError(400, "Saldo insuficiente para o empréstimo.");
    const loanUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const rosterPlayer = await tx.teamPlayer.create({
      data: {
        teamId: team.id,
        basePlayerId: player.id,
        overall: player.overall,
        attrs: player.attrs as Prisma.InputJsonValue,
        position: player.positions[0] ?? "CM",
        acquiredPrice: price,
        isLoan: true,
        loanUntil,
      },
    });
    await tx.pointsLedger.create({ data: { teamId: team.id, type: "LOAN", amount: -price, description: `Empréstimo: ${player.shortName}` } });
    await tx.transferRecord.create({ data: { teamId: team.id, type: "LOAN", playerName: player.shortName, amount: -price, description: `Empréstimo por ${days} dias` } });
    return { player: rosterPlayer, price, loanUntil, balance: balance - price };
  });
  res.status(201).json(result);
});

transfersRouter.post("/auctions", async (req, res) => {
  const { basePlayerId, minBid } = parse(auctionSchema, req.body);
  const team = await ownedTeam(req.user!.id);

  const auction = await prisma.$transaction(async (tx) => {
    const player = await tx.basePlayer.findUnique({ where: { id: basePlayerId } });
    if (!player) throw new HttpError(404, "Jogador não encontrado");
    const alreadyOwned = await tx.teamPlayer.findFirst({
      where: { basePlayerId, status: "ACTIVE", team: { userId: { not: null } } },
    });
    if (alreadyOwned) throw new HttpError(409, "Não é possível leiloar um jogador que já pertence a uma equipa.");
    const window = await openWindow(tx);
    const minimum = minBid ?? await priceFor(player.overall, "sell");
    const auction = await tx.auction.create({
      data: { windowId: window.id, basePlayerId, minBid: minimum, endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      include: { basePlayer: { select: { shortName: true, overall: true } } },
    });
    await tx.transferRecord.create({ data: { teamId: team.id, type: "AUCTION", playerName: player.shortName, amount: 0, description: `Leilão criado · mínimo ${minimum} pts` } });
    return auction;
  });

  res.status(201).json({ auction });
});

transfersRouter.post("/auctions/:id/bids", async (req, res) => {
  const auctionId = Number(req.params.id);
  const { amount } = parse(bidSchema, req.body);
  if (!Number.isInteger(auctionId) || auctionId < 1) throw new HttpError(400, "Leilão inválido");
  const team = await ownedTeam(req.user!.id);

  const bid = await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({ where: { id: auctionId }, include: { bids: { orderBy: { amount: "desc" }, take: 1 }, basePlayer: { select: { shortName: true } } } });
    if (!auction || auction.status !== "OPEN" || (auction.endsAt && auction.endsAt <= new Date())) throw new HttpError(409, "Este leilão já terminou.");
    const latestBid = auction.bids[0]?.amount ?? 0;
    if (amount < auction.minBid || amount <= latestBid) throw new HttpError(400, `O lance tem de ser pelo menos ${Math.max(auction.minBid, latestBid + 1)} pontos.`);
    if (await getBalance(team.id, tx) < amount) throw new HttpError(400, "Saldo insuficiente para cobrir este lance.");
    const created = await tx.bid.create({ data: { auctionId, teamId: team.id, amount } });
    await tx.transferRecord.create({ data: { teamId: team.id, type: "AUCTION", playerName: auction.basePlayer.shortName, amount: 0, description: `Lance de ${amount} pts · leilão #${auctionId}` } });
    return created;
  });

  res.status(201).json({ bid });
});

transfersRouter.post("/auctions/:id/settle", async (req, res) => {
  const auctionId = Number(req.params.id);
  if (!Number.isInteger(auctionId) || auctionId < 1) throw new HttpError(400, "Leilão inválido");

  const result = await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: { bids: { orderBy: [{ amount: "desc" }, { createdAt: "asc" }], take: 1 }, basePlayer: true },
    });
    if (!auction || auction.status !== "OPEN") throw new HttpError(404, "Leilão aberto não encontrado.");
    if (auction.endsAt && auction.endsAt > new Date()) throw new HttpError(400, "O leilão ainda está aberto.");
    const winnerBid = auction.bids[0];
    if (!winnerBid) {
      await tx.auction.update({ where: { id: auction.id }, data: { status: "NO_BIDS" } });
      return { status: "NO_BIDS" as const };
    }

    const balance = await getBalance(winnerBid.teamId, tx);
    if (balance < winnerBid.amount) throw new HttpError(409, "O vencedor já não tem saldo suficiente para liquidar o lance.");
    await tx.teamPlayer.create({
      data: {
        teamId: winnerBid.teamId,
        basePlayerId: auction.basePlayerId,
        overall: auction.basePlayer.overall,
        attrs: auction.basePlayer.attrs as Prisma.InputJsonValue,
        position: auction.basePlayer.positions[0] ?? "CM",
        acquiredPrice: winnerBid.amount,
      },
    });
    await tx.pointsLedger.create({
      data: { teamId: winnerBid.teamId, type: "AUCTION", amount: -winnerBid.amount, description: `Leilão: ${auction.basePlayer.shortName}` },
    });
    await tx.transferRecord.create({ data: { teamId: winnerBid.teamId, type: "AUCTION", playerName: auction.basePlayer.shortName, amount: -winnerBid.amount, description: "Leilão ganho" } });
    await tx.auction.update({
      where: { id: auction.id },
      data: { status: "CLOSED", winnerTeamId: winnerBid.teamId, winningBid: winnerBid.amount },
    });
    return { status: "CLOSED" as const, winnerTeamId: winnerBid.teamId, winningBid: winnerBid.amount };
  });

  res.json(result);
});