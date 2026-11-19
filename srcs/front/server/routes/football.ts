import { Router } from "express";
import { z } from "zod";
import { apiFootball } from "../lib/apiFootball";
import { env } from "../env";
import { HttpError, parse } from "../lib/http";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const footballRouter = Router();
footballRouter.use(requireAuth, requireAdmin);

// Só endpoints permitidos: evita gastar a quota com pedidos arbitrários.
const ALLOWED = ["leagues", "teams", "players", "players/profiles", "players/topscorers", "fixtures", "standings"];

const querySchema = z.object({ endpoint: z.string().refine((e) => ALLOWED.includes(e), "Endpoint não permitido") });

// Exemplo: GET /football?endpoint=players/profiles&search=mbappe
footballRouter.get("/", async (req, res) => {
  const { endpoint, ...params } = req.query as Record<string, string>;
  parse(querySchema, { endpoint });
  const data = await apiFootball(endpoint, params);
  res.json({ data });
});

// Não conta para a quota diária
footballRouter.get("/status", async (_req, res) => {
  if (!env.API_FOOTBALL_KEY) throw new HttpError(503, "API-Football não está configurada");
  const r = await fetch("https://v3.football.api-sports.io/status", { headers: { "x-apisports-key": env.API_FOOTBALL_KEY } });
  res.json(await r.json());
});
