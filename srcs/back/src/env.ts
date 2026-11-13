import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const envPaths = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET precisa de pelo menos 16 caracteres"),
  INITIAL_POINTS: z.coerce.number().int().default(50),
  // Opcional: sem chave, as rotas /football respondem 503 e o resto da app funciona.
  API_FOOTBALL_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
