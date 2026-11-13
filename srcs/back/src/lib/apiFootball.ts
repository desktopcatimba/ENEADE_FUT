import { env } from "../env";
import { HttpError } from "./http";
import { prisma } from "./prisma";

const BASE = "https://v3.football.api-sports.io";

type Envelope<T> = {
  errors: unknown[] | Record<string, string>;
  results: number;
  response: T;
};

/**
 * Chama a API-Football SÓ a partir do servidor (a chave nunca vai para o browser).
 * Cada resposta fica em cache na base de dados para poupar a quota diária.
 */
export async function apiFootball<T = unknown>(
  endpoint: string,
  params: Record<string, string | number> = {},
  ttlSeconds = 24 * 60 * 60,
): Promise<T> {
  if (!env.API_FOOTBALL_KEY) throw new HttpError(503, "API-Football não está configurada");

  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  qs.sort();
  const key = `${endpoint}?${qs}`;

  const cached = await prisma.apiCache.findUnique({ where: { key } });
  if (cached && cached.expiresAt > new Date()) return cached.payload as T;

  // Só o cabeçalho x-apisports-key é permitido pela API.
  const res = await fetch(`${BASE}/${endpoint}?${qs}`, {
    headers: { "x-apisports-key": env.API_FOOTBALL_KEY },
  });
  if (res.status === 429) throw new HttpError(429, "Limite de pedidos da API-Football atingido");
  if (!res.ok) throw new HttpError(502, `API-Football respondeu ${res.status}`);

  const body = (await res.json()) as Envelope<T>;
  // A API responde 200 mesmo com erros (chave inválida, quota esgotada...)
  const errors = Array.isArray(body.errors) ? body.errors : Object.values(body.errors ?? {});
  if (errors.length) {
    if (cached) return cached.payload as T; // melhor dados velhos do que nada
    throw new HttpError(502, `API-Football: ${errors.join("; ")}`);
  }

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await prisma.apiCache.upsert({
    where: { key },
    create: { key, payload: body.response as object, expiresAt },
    update: { payload: body.response as object, fetchedAt: new Date(), expiresAt },
  });
  return body.response;
}
