import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError, parse } from "../lib/http";
import { requireAuth } from "../middleware/auth";

export const playersRouter = Router();
playersRouter.use(requireAuth);

const querySchema = z.object({
  q: z.string().trim().min(1).optional(),
  position: z.string().trim().toUpperCase().optional(),
  club: z.string().trim().optional(),
  nationality: z.string().trim().optional(),
  minOverall: z.coerce.number().int().min(1).max(99).optional(),
  maxOverall: z.coerce.number().int().min(1).max(99).optional(),
  minAge: z.coerce.number().int().min(1).max(100).optional(),
  maxAge: z.coerce.number().int().min(1).max(100).optional(),
  fifaVersion: z.coerce.number().int().refine((v) => v === 23 || v === 24, "Use 23 ou 24").default(24),
  sort: z.enum(["overall", "potential", "name", "age"]).default("overall"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).refine(
  (filters) => filters.minOverall === undefined || filters.maxOverall === undefined || filters.minOverall <= filters.maxOverall,
  { path: ["maxOverall"], message: "O overall máximo deve ser igual ou superior ao mínimo" },
).refine(
  (filters) => filters.minAge === undefined || filters.maxAge === undefined || filters.minAge < filters.maxAge,
  { path: ["maxAge"], message: "A idade limite superior deve ser maior que a inferior" },
);

const GROUPS = ["attacking", "skill", "movement", "power", "mentality", "defending", "goalkeeping"] as const;

function groupAttrs(attrs: Record<string, number | null>) {
  const out: Record<string, Record<string, number | null>> = {};
  for (const g of GROUPS) out[g] = {};
  for (const [key, value] of Object.entries(attrs)) {
    const g = GROUPS.find((p) => key.startsWith(p));
    if (!g) continue;
    const name = key.slice(g.length);
    out[g][name.charAt(0).toLowerCase() + name.slice(1)] = value;
  }
  return out;
}

playersRouter.get("/", async (req, res) => {
  const f = parse(querySchema, req.query);

  const where: Prisma.BasePlayerWhereInput = { fifaVersion: f.fifaVersion };
  if (f.q) where.OR = [
    { shortName: { contains: f.q, mode: "insensitive" } },
    { longName: { contains: f.q, mode: "insensitive" } },
  ];
  if (f.position) where.positions = { has: f.position };
  if (f.club) where.clubName = { contains: f.club, mode: "insensitive" };
  if (f.nationality) where.nationality = { contains: f.nationality, mode: "insensitive" };
  if (f.minOverall || f.maxOverall) where.overall = { gte: f.minOverall, lte: f.maxOverall };
  if (f.minAge !== undefined || f.maxAge !== undefined) where.age = { gt: f.minAge, lt: f.maxAge };

  const sortField = f.sort === "name" ? "shortName" : f.sort;
  const [total, players] = await Promise.all([
    prisma.basePlayer.count({ where }),
    prisma.basePlayer.findMany({
      where,
      orderBy: [{ [sortField]: f.order }, { id: "asc" }],
      skip: (f.page - 1) * f.limit,
      take: f.limit,
      select: {
        id: true, sofifaId: true, fifaVersion: true, shortName: true, longName: true, positions: true,
        overall: true, potential: true, age: true, clubName: true, leagueName: true, nationality: true,
        preferredFoot: true, weakFoot: true, skillMoves: true, faceStats: true,
      },
    }),
  ]);

  res.json({ page: f.page, limit: f.limit, total, pages: Math.ceil(total / f.limit), players });
});

playersRouter.get("/:id", async (req, res) => {
  const rawId = req.params.id;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    const rosterPlayer = await prisma.teamPlayer.findFirst({
      where: { id: rawId, status: "ACTIVE", team: { userId: req.user!.id }, customPlayerId: { not: null } },
      include: { customPlayer: true, team: true },
    });
    const p = rosterPlayer?.customPlayer;
    if (!p || !rosterPlayer) throw new HttpError(404, "Jogador personalizado não encontrado");
    const attrs = p.attrs as Record<string, number | null>;
    res.json({
      player: {
        ...p,
        id: rosterPlayer.id,
        overall: rosterPlayer.overall,
        attrs,
        attrGroups: groupAttrs(attrs),
        faceStats: p.faceStats,
        positionRatings: p.positionRatings,
        fifaVersion: null,
        teamPlayerId: rosterPlayer.id,
        isOwnedByUser: true,
        teamId: rosterPlayer.teamId,
      },
    });
    return;
  }

  const p = await prisma.basePlayer.findUnique({ where: { id } });
  if (!p) throw new HttpError(404, "Jogador não encontrado");
  const teamPlayer = await prisma.teamPlayer.findFirst({
    where: { basePlayerId: id, status: "ACTIVE", team: { userId: req.user!.id } },
    include: { team: true },
  });
  const attrs = (teamPlayer?.attrs ?? p.attrs) as Record<string, number | null>;
  const { attrs: _baseAttrs, ...rest } = p;
  res.json({
    player: {
      ...rest,
      overall: teamPlayer?.overall ?? p.overall,
      attrs,
      attrGroups: groupAttrs(attrs),
      teamPlayerId: teamPlayer?.id ?? null,
      teamId: teamPlayer?.teamId ?? null,
      isOwnedByUser: Boolean(teamPlayer),
    },
  });
});
