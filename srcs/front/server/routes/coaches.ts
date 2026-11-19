import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";

export const coachesRouter = Router();
coachesRouter.use(requireAuth);

const coachesPath = path.resolve(__dirname, "../../datas/male_coaches.json");

type CoachEntry = {
  coach_id: number;
  coach_name?: string;
  name?: string;
  nationality?: string;
  nationality_name?: string;
  team_name?: string;
  club_name?: string;
  coach_url?: string;
  coach_face_url?: string;
  [key: string]: unknown;
};

function readCoaches(): CoachEntry[] {
  const raw = fs.readFileSync(coachesPath, "utf8");
  return JSON.parse(raw) as CoachEntry[];
}

function normalizeCoach(c: CoachEntry) {
  const name = c.coach_name ?? c.name ?? "Treinador";
  return {
    id: String(c.coach_id),
    name,
    nationality: c.nationality_name ?? c.nationality ?? null,
    teamName: c.team_name ?? c.club_name ?? null,
    faceUrl: c.coach_face_url ?? null,
    url: c.coach_url ?? null,
  };
}

coachesRouter.get("/", (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const coaches = readCoaches()
    .map(normalizeCoach)
    .filter((coach) => {
      if (!q) return true;
      return `${coach.name} ${coach.teamName ?? ""}`.toLowerCase().includes(q);
    })
    .slice(0, 60);

  res.json({ coaches, total: coaches.length });
});

coachesRouter.get("/:id", (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const coach = readCoaches()
    .map(normalizeCoach)
    .find((item) => Number(item.id) === id);

  if (!coach) {
    return res.status(404).json({ error: "Treinador não encontrado." });
  }

  res.json({ coach });
});
