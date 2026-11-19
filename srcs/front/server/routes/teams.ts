import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError, parse } from "../lib/http";
import { getBalance } from "../lib/points";
import { env } from "../env";
import { requireAuth } from "../middleware/auth";

export const teamsRouter = Router();

const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "5-3-2", "4-1-4-1", "4-5-1"] as const;
const teamCatalogPath = path.resolve(__dirname, "../../datas/male_teams.json");
const RANDOM_NAMES = [
  "Edvaldo Catimba",
  "Juelson Soxi",
  "Alessio Baza Esménio",
  "Eduardo Trincheira",
  "Mário Lixeiro",
  "Ruan Toco",
  "Hélio Caxias",
  "Nicolau Mangança",
  "Gonçalo Deriva",
  "Ismael Viscoso",
  "Davi Pimentel",
  "Leandro Fulete",
  "Breno Camastro",
  "Jorge Fumaça",
  "Iago Piranha",
  "Caetano Mestiço",
  "Tiago Boleia",
  "Mateus Cebolinha",
  "Pablo Canto",
  "Rafael Gelo",
  "Nelson Pinga",
  "Zito Marmelo",
];
const NAME_FIRST = ["Edvaldo", "Juelson", "Alessio", "Edivaldo", "Mário", "Ruan", "Hélio", "Nicolau", "Gonçalo", "Ismael", "Davi", "Leandro", "Breno", "Jorge", "Iago", "Caetano", "Tiago", "Mateus", "Pablo", "Rafael", "Nelson", "Zito", "Tadeu", "Adriano", "Lourenço", "Amílcar"];
const NAME_LAST = ["Catimba", "Soxi", "Baza Esménio", "Trincheira", "Lixeiro", "Toco", "Caxias", "Mangança", "Deriva", "Viscoso", "Pimentel", "Fulete", "Camastro", "Fumaça", "Piranha", "Mestiço", "Boleia", "Cebolinha", "Canto", "Gelo", "Pinga", "Marmelo", "Caculo", "Furacão", "Bicudo", "Trovão"];

const ATTR_KEYS = [
  "attackingCrossing", "attackingFinishing", "attackingHeadingAccuracy", "attackingShortPassing", "attackingVolleys",
  "skillDribbling", "skillCurve", "skillFkAccuracy", "skillLongPassing", "skillBallControl",
  "movementAcceleration", "movementSprintSpeed", "movementAgility", "movementReactions", "movementBalance",
  "powerShotPower", "powerJumping", "powerStamina", "powerStrength", "powerLongShots",
  "mentalityAggression", "mentalityInterceptions", "mentalityPositioning", "mentalityVision", "mentalityPenalties", "mentalityComposure",
  "defendingMarkingAwareness", "defendingStandingTackle", "defendingSlidingTackle",
  "goalkeepingDiving", "goalkeepingHandling", "goalkeepingKicking", "goalkeepingPositioning", "goalkeepingReflexes",
];
const ROLE_POSITIONS = [
  ...Array(6).fill("ATTACK"), ...Array(6).fill("MIDFIELD"), ...Array(8).fill("DEFENCE"), ...Array(2).fill("GOALKEEPER"),
];
const POSITION_BY_ROLE: Record<string, string[]> = {
  ATTACK: ["ST", "LW", "RW", "CF", "LF", "RF"],
  MIDFIELD: ["CM", "CAM", "CDM", "LM", "RM", "AM"],
  DEFENCE: ["CB", "LB", "RB", "LWB", "RWB"],
  GOALKEEPER: ["GK"],
};

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function newUniquePlayerName(tx: Prisma.TransactionClient, used: Set<string>) {
  const shuffled = [...RANDOM_NAMES].sort(() => Math.random() - 0.5);
  const candidates = [...shuffled, ...Array.from({ length: 60 }, () => `${pickRandom(NAME_FIRST)} ${pickRandom(NAME_LAST)}`)];
  for (const candidate of candidates) {
    const key = candidate.toLocaleLowerCase();
    if (used.has(key)) continue;
    const [baseCollision, customCollision] = await Promise.all([
      tx.basePlayer.findFirst({ where: { OR: [{ shortName: { equals: candidate, mode: "insensitive" } }, { longName: { equals: candidate, mode: "insensitive" } }] }, select: { id: true } }),
      tx.customPlayer.findFirst({ where: { OR: [{ shortName: { equals: candidate, mode: "insensitive" } }, { longName: { equals: candidate, mode: "insensitive" } }] }, select: { id: true } }),
    ]);
    if (!baseCollision && !customCollision) {
      used.add(key);
      return candidate;
    }
  }
  throw new HttpError(503, "Não foi possível gerar um nome de jogador único. Tenta novamente.");
}

async function ensureTeamPlayers(tx: Prisma.TransactionClient, teamId: string, teamName: string) {
  const existingCount = await tx.teamPlayer.count({ where: { teamId } });
  if (existingCount > 0) return;

  const usedNames = new Set<string>();
  const now = new Date();
  for (const [index, role] of ROLE_POSITIONS.entries()) {
    const position = pickRandom(POSITION_BY_ROLE[role]);
    const attrs = Object.fromEntries(ATTR_KEYS.map((key) => [key, randomInt(50, 55)]));
    const values = Object.values(attrs) as number[];
    const overall = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    const age = randomInt(17, 34);
    const dob = new Date(now.getFullYear() - age, randomInt(0, 11), randomInt(1, 28)).toISOString().slice(0, 10);
    const name = await newUniquePlayerName(tx, usedNames);
    const faceStats = {
      pace: Math.round((attrs.movementAcceleration + attrs.movementSprintSpeed) / 2),
      shooting: Math.round((attrs.attackingFinishing + attrs.powerShotPower + attrs.powerLongShots) / 3),
      passing: Math.round((attrs.attackingShortPassing + attrs.skillLongPassing + attrs.mentalityVision) / 3),
      dribbling: Math.round((attrs.skillDribbling + attrs.skillBallControl + attrs.movementAgility) / 3),
      defending: Math.round((attrs.defendingMarkingAwareness + attrs.defendingStandingTackle + attrs.mentalityInterceptions) / 3),
      physic: Math.round((attrs.powerStrength + attrs.powerStamina + attrs.powerJumping) / 3),
    };
    const custom = await tx.customPlayer.create({
      data: {
        shortName: name,
        longName: name,
        positions: [position],
        overall,
        potential: Math.min(99, overall + randomInt(0, 8)),
        age,
        dob,
        heightCm: randomInt(160, role === "GOALKEEPER" ? 200 : 195),
        weightKg: randomInt(55, 95),
        clubName: teamName,
        nationality: pickRandom(["Angola", "Portugal", "Brasil", "Moçambique", "Cabo Verde"]),
        preferredFoot: pickRandom(["Left", "Right"]),
        weakFoot: randomInt(1, 5),
        skillMoves: randomInt(1, 5),
        workRate: pickRandom(["Low/Medium", "Medium/Medium", "Medium/High", "High/Medium"]),
        bodyType: pickRandom(["Average", "Lean", "Stocky"]),
        playerUrl: `custom://${teamId}/${index + 1}`,
        faceStats,
        attrs,
        positionRatings: { [position.toLowerCase()]: overall },
      },
    });
    await tx.teamPlayer.create({
      data: {
        teamId,
        customPlayerId: custom.id,
        displayName: name,
        position,
        overall,
        attrs,
        status: "ACTIVE",
        acquiredPrice: 0,
      },
    });
  }
}

async function ensureCatalogTeamPlayers(tx: Prisma.TransactionClient, teamId: string, catalogTeamId: number) {
  const existingCount = await tx.teamPlayer.count({ where: { teamId } });
  if (existingCount > 0) return;

  const catalogTeam = readCatalogTeams().find((team) => team.team_id === catalogTeamId);
  if (!catalogTeam) throw new HttpError(404, "Equipa não encontrada no catálogo");

  const players = await tx.basePlayer.findMany({
    where: {
      fifaVersion: 24,
      clubName: { equals: catalogTeam.team_name, mode: "insensitive" },
    },
    select: { id: true, overall: true, attrs: true, positions: true },
    orderBy: [{ overall: "desc" }, { id: "asc" }],
  });

  if (!players.length) return;

  await tx.teamPlayer.createMany({
    data: players.map((player) => ({
      teamId,
      basePlayerId: player.id,
      position: player.positions[0] ?? "CM",
      overall: player.overall,
      attrs: player.attrs as Prisma.InputJsonValue,
      status: "ACTIVE" as const,
      acquiredPrice: 0,
    })),
  });
}

async function getUserTeamWithPlayers(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { selectedTeamId: true },
  });
  const selectedTeam = user?.selectedTeamId
    ? await prisma.team.findUnique({
      where: { id: user.selectedTeamId },
      include: { players: { where: { status: "ACTIVE" }, include: { basePlayer: true, customPlayer: true } } },
    })
    : null;
  const team = selectedTeam ?? await prisma.team.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { players: { where: { status: "ACTIVE" }, include: { basePlayer: true, customPlayer: true } } },
  });
  if (!team) return null;

  if (team.userId && !team.catalogTeamId && team.players.length === 0) {
    await prisma.$transaction((tx) => ensureTeamPlayers(tx, team.id, team.name));
    return prisma.team.findUnique({
      where: { id: team.id },
      include: { players: { where: { status: "ACTIVE" }, include: { basePlayer: true, customPlayer: true } } },
    });
  }

  if (
    team.userId &&
    !team.catalogTeamId &&
    team.players.length > 0 &&
    team.players.every((player) => !player.customPlayerId && player.displayName && player.acquiredPrice === 0)
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.teamPlayer.deleteMany({ where: { teamId: team.id, customPlayerId: null, displayName: { not: null }, acquiredPrice: 0 } });
      await ensureTeamPlayers(tx, team.id, team.name);
    });
    return prisma.team.findUnique({
      where: { id: team.id },
      include: { players: { where: { status: "ACTIVE" }, include: { basePlayer: true, customPlayer: true } } },
    });
  }

  return team;
}

type CatalogTeam = {
  team_id: number;
  team_name: string;
  league_name?: string;
  nationality_name?: string;
  overall?: number;
  attack?: number;
  midfield?: number;
  defence?: number;
  home_stadium?: string;
  coach_id?: number;
};

const createSchema = z.object({
  name: z.string().trim().min(2).max(40),
  crest: z.string().trim().max(300).optional(),
  formation: z.enum(FORMATIONS).optional(),
});
const updateSchema = createSchema.partial();
const selectSchema = z.object({ teamId: z.string().min(1) });
const customPlayerSchema = z.object({
  shortName: z.string().trim().min(2).max(40),
  longName: z.string().trim().min(2).max(80).optional(),
  positions: z.array(z.string().trim().min(2).max(4)).min(1).max(5),
  age: z.coerce.number().int().min(15).max(50).nullable().optional(),
  nationality: z.string().trim().max(40).nullable().optional(),
  preferredFoot: z.string().trim().max(12).nullable().optional(),
  attrs: z.record(z.string(), z.coerce.number().int().min(0).max(99)),
});

function calculateOverall(attrs: Record<string, unknown>) {
  const values = Object.values(attrs).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!values.length) throw new HttpError(400, "Indica pelo menos um atributo numérico.");
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

async function getOwnedTeam(userId: string) {
  const selectedTeamId = (await prisma.user.findUnique({ where: { id: userId }, select: { selectedTeamId: true } }))?.selectedTeamId;
  if (selectedTeamId) {
    const selected = await prisma.team.findFirst({ where: { id: selectedTeamId, userId } });
    if (selected) return selected;
  }
  return prisma.team.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
}

function readCatalogTeams(): CatalogTeam[] {
  return JSON.parse(fs.readFileSync(teamCatalogPath, "utf8")) as CatalogTeam[];
}

function normalizeCatalogTeam(team: CatalogTeam) {
  return {
    id: String(team.team_id),
    name: team.team_name,
    league: team.league_name ?? null,
    nationality: team.nationality_name ?? null,
    overall: team.overall ?? 0,
    attack: team.attack ?? null,
    midfield: team.midfield ?? null,
    defence: team.defence ?? null,
    stadium: team.home_stadium ?? null,
    coachId: team.coach_id ?? null,
    crest: null,
    formation: "4-3-3",
  };
}

teamsRouter.use(requireAuth);

teamsRouter.get("/", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 12);
  const q = String(req.query.q ?? "").trim();

  const allTeams = readCatalogTeams().map(normalizeCatalogTeam);
  const filtered = q
    ? allTeams.filter((team) => `${team.name} ${team.league ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    : allTeams;

  const total = filtered.length;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 24) : 12;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;

  res.json({
    page: safePage,
    pages,
    total,
    limit: safeLimit,
    teams: filtered.slice(start, start + safeLimit),
  });
});

teamsRouter.get("/catalog", async (_req, res) => {
  const teams = readCatalogTeams().map(normalizeCatalogTeam);
  res.json({ teams, total: teams.length });
});

teamsRouter.get("/mine", async (req, res) => {
  const team = await getUserTeamWithPlayers(req.user!.id);
  res.json({ team, points: team ? await getBalance(team.id) : 0 });
});

teamsRouter.get("/me", async (req, res) => {
  const team = await getUserTeamWithPlayers(req.user!.id);
  res.json({ team, points: team ? await getBalance(team.id) : 0 });
});

teamsRouter.get("/me/ledger", async (req, res) => {
  const team = await getUserTeamWithPlayers(req.user!.id);
  if (!team) return res.json({ balance: 0, entries: [] });
  const entries = await prisma.pointsLedger.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ balance: await getBalance(team.id), entries });
});

teamsRouter.get("/me/players", async (req, res) => {
  const team = await getUserTeamWithPlayers(req.user!.id);

  if (!team) return res.json({ team: null, players: [] });

  const players = team.players
    .filter((player) => player.status === "ACTIVE")
    .map((player) => {
      const profile = player.customPlayer ?? player.basePlayer;
      if (!profile) return null;
      return {
        ...player,
        displayName: player.displayName ?? profile.shortName,
        isCustomPlayer: Boolean(player.customPlayerId),
        canEdit: team.userId === req.user!.id && Boolean(player.customPlayerId),
        profile,
        basePlayer: {
          id: profile.id,
          shortName: profile.shortName,
          longName: profile.longName,
          positions: profile.positions,
          overall: profile.overall,
          age: profile.age,
          clubName: profile.clubName,
          nationality: profile.nationality,
          potential: profile.potential,
        },
      };
    })
    .filter((player) => player !== null);

  res.json({
    team,
    players,
  });
});

teamsRouter.patch("/me/players/:id", async (req, res) => {
  const id = req.params.id;
  const playerSchema = z.object({
    attrs: z.record(z.string(), z.coerce.number().int().min(0).max(99)).refine(
      (attrs) => Object.keys(attrs).length > 0,
      "Indica pelo menos um atributo.",
    ),
  });

  const data = parse(playerSchema, req.body);
  const team = await getOwnedTeam(req.user!.id);
  if (!team) throw new HttpError(404, "Ainda não tens equipa própria");

  const player = await prisma.teamPlayer.findFirst({
    where: { id, teamId: team.id, status: "ACTIVE" },
  });
  if (!player) throw new HttpError(404, "Jogador não encontrado no teu plantel");

  const attrs = { ...(player.attrs as Record<string, number | null>), ...data.attrs };
  const overall = calculateOverall(attrs);

  const updated = await prisma.$transaction(async (tx) => {
    const rosterPlayer = await tx.teamPlayer.update({
      where: { id: player.id },
      data: {
        overall,
        attrs: attrs as Prisma.InputJsonValue,
      },
    });
    if (player.customPlayerId) {
      await tx.customPlayer.update({ where: { id: player.customPlayerId }, data: { overall, attrs: attrs as Prisma.InputJsonValue } });
    }
    return rosterPlayer;
  });

  res.json({ player: updated, overall });
});

teamsRouter.post("/me/players", async (req, res) => {
  const team = await getOwnedTeam(req.user!.id);
  if (!team) throw new HttpError(403, "Só podes adicionar jogadores à tua própria equipa.");
  const data = parse(customPlayerSchema, req.body);
  const name = data.shortName;
  const [baseCollision, customCollision] = await Promise.all([
    prisma.basePlayer.findFirst({ where: { OR: [{ shortName: { equals: name, mode: "insensitive" } }, { longName: { equals: name, mode: "insensitive" } }] }, select: { id: true } }),
    prisma.customPlayer.findFirst({ where: { OR: [{ shortName: { equals: name, mode: "insensitive" } }, { longName: { equals: name, mode: "insensitive" } }] }, select: { id: true } }),
  ]);
  if (baseCollision || customCollision) throw new HttpError(409, "Já existe um jogador com esse nome.");

  const overall = calculateOverall(data.attrs);
  const player = await prisma.$transaction(async (tx) => {
    const profile = await tx.customPlayer.create({
      data: {
        shortName: data.shortName,
        longName: data.longName ?? data.shortName,
        positions: data.positions,
        overall,
        potential: overall,
        age: data.age ?? null,
        nationality: data.nationality ?? null,
        preferredFoot: data.preferredFoot ?? null,
        playerUrl: `custom://${team.id}/${Date.now()}`,
        faceStats: {},
        attrs: data.attrs,
        positionRatings: {},
        clubName: team.name,
      },
    });
    return tx.teamPlayer.create({
      data: {
        teamId: team.id,
        customPlayerId: profile.id,
        displayName: profile.shortName,
        position: profile.positions[0],
        overall,
        attrs: data.attrs,
        status: "ACTIVE",
      },
      include: { customPlayer: true },
    });
  });
  res.status(201).json({ player });
});

teamsRouter.post("/select", async (req, res) => {
  const { teamId } = parse(selectSchema, req.body);
  const catalogTeam = readCatalogTeams().find((team) => String(team.team_id) === teamId);
  if (!catalogTeam) throw new HttpError(404, "Equipa não encontrada no catálogo");

  const team = await prisma.$transaction(async (tx) => {
    let target = await tx.team.findFirst({ where: { catalogTeamId: catalogTeam.team_id, userId: null } });
    if (!target) {
      target = await tx.team.create({
        data: {
          name: catalogTeam.team_name,
          formation: "4-3-3",
          catalogTeamId: catalogTeam.team_id,
          userId: null,
        },
      });
    }

    await ensureCatalogTeamPlayers(tx, target.id, catalogTeam.team_id);

    await tx.user.update({ where: { id: req.user!.id }, data: { selectedTeamId: target.id } });
    return target;
  });

  res.json({ team, selectedTeamId: team.id, points: await getBalance(team.id) });
});

teamsRouter.post("/", async (req, res) => {
  const data = parse(createSchema, req.body);
  const userId = req.user!.id;
  if (await prisma.team.findFirst({ where: { name: data.name } })) {
    throw new HttpError(409, "Já existe uma equipa com este nome.");
  }

  const team = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({ data: { ...data, userId } });
    await ensureTeamPlayers(tx, created.id, created.name);
    await tx.pointsLedger.create({
      data: { teamId: created.id, type: "INITIAL", amount: env.INITIAL_POINTS, description: "Pontos iniciais" },
    });
    await tx.user.update({ where: { id: userId }, data: { selectedTeamId: created.id } });
    return created;
  });
  res.status(201).json({ team, points: env.INITIAL_POINTS });
});

teamsRouter.patch("/me", async (req, res) => {
  const data = parse(updateSchema, req.body);
  const team = await getOwnedTeam(req.user!.id);
  if (!team) throw new HttpError(404, "Ainda não tens equipa própria");
  if (data.name && data.name !== team.name && await prisma.team.findFirst({ where: { name: data.name } })) {
    throw new HttpError(409, "Já existe uma equipa com este nome");
  }
  res.json({ team: await prisma.team.update({ where: { id: team.id }, data }) });
});

teamsRouter.get("/:id", async (req, res) => {
  const catalogTeam = readCatalogTeams().find((team) => String(team.team_id) === req.params.id);
  if (catalogTeam) {
    const normalized = normalizeCatalogTeam(catalogTeam);
    const roster = await prisma.basePlayer.findMany({
      where: {
        fifaVersion: 24,
        clubName: { equals: catalogTeam.team_name, mode: "insensitive" },
      },
      orderBy: [{ overall: "desc" }, { id: "asc" }],
      select: {
        id: true,
        shortName: true,
        longName: true,
        overall: true,
        positions: true,
        age: true,
        clubName: true,
        nationality: true,
      },
    });
    return res.json({
      team: normalized,
      players: roster.map((player) => ({
        id: String(player.id),
        displayName: player.shortName,
        position: player.positions[0] ?? "CM",
        overall: player.overall,
        basePlayer: player,
      })),
    });
  }
  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) throw new HttpError(404, "Equipa não encontrada");

  const roster = await prisma.teamPlayer.findMany({
    where: { teamId: team.id, status: "ACTIVE" },
    include: { basePlayer: true, customPlayer: true },
    orderBy: [{ overall: "desc" }, { displayName: "asc" }],
  });

  const overall = roster.length
    ? Math.round(roster.reduce((sum, player) => sum + player.overall, 0) / roster.length)
    : null;
  res.json({ team: { ...team, overall, playerCount: roster.length }, players: roster.map((p) => {
    const profile = p.customPlayer ?? p.basePlayer;
    return {
      ...p,
      playerUrlId: p.customPlayerId ? p.id : profile?.id,
      displayName: p.displayName ?? profile?.shortName ?? "Jogador",
      basePlayer: profile,
    };
  }) });
});
