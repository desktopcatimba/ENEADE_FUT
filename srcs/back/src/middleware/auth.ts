import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { HttpError } from "../lib/http";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) throw new HttpError(401, "Não autenticado");
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: string };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new HttpError(401, "Sessão inválida ou expirada");
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") throw new HttpError(403, "Só para administradores");
  next();
}
