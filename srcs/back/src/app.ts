import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { teamsRouter } from "./routes/teams";
import { playersRouter } from "./routes/players";
import { coachesRouter } from "./routes/coaches";
import { transfersRouter } from "./routes/transfers";
import { errorHandler } from "./middleware/error";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use("/teams", teamsRouter);
app.use("/coaches", coachesRouter);
app.use("/players", playersRouter);
app.use("/transfers", transfersRouter);

app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada" }));
app.use(errorHandler);
