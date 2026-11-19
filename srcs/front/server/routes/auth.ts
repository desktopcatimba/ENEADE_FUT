import { Router } from "express";
import type { Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError, parse } from "../lib/http";
import { env } from "../env";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((s) => s.toLowerCase()),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres").max(100),
  birthDate: z.coerce.date().refine((d) => d < new Date(), "Data de nascimento inválida"),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/, "Número de telefone inválido"),
});

const loginSchema = z.object({
  email: z.email().transform((s) => s.toLowerCase()),
  password: z.string().min(1),
});

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

function publicUser(u: { id: string; name: string; email: string; birthDate: Date; phone: string; role: string }) {
  return { id: u.id, name: u.name, email: u.email, birthDate: u.birthDate, phone: u.phone, role: u.role };
}

function setSession(res: Response, user: { id: string; role: string }) {
  const token = jwt.sign({ role: user.role }, env.JWT_SECRET, { subject: user.id, expiresIn: "7d" });
  res.cookie("token", token, cookieOptions);
}

authRouter.post("/register", limiter, async (req, res) => {
  const data = parse(registerSchema, req.body);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new HttpError(409, "Já existe uma conta com este email");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, birthDate: data.birthDate, phone: data.phone },
  });
  setSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post("/login", limiter, async (req, res) => {
  const data = parse(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const ok = user ? await bcrypt.compare(data.password, user.passwordHash) : false;
  if (!user || !ok) throw new HttpError(401, "Email ou senha incorretos");
  setSession(res, user);
  res.json({ user: publicUser(user) });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token", { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { teams: { orderBy: { createdAt: "desc" } }, selectedTeam: true },
  });
  if (!user) throw new HttpError(401, "Utilizador não encontrado");
  res.json({
    user: publicUser(user),
    team: user.selectedTeam ?? user.teams[0] ?? null,
    selectedTeam: user.selectedTeam ?? user.teams[0] ?? null,
  });
});
