import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

type PointsClient = Pick<Prisma.TransactionClient, "pointsLedger">;

export async function getBalance(teamId: string, client: PointsClient = prisma): Promise<number> {
  const r = await client.pointsLedger.aggregate({
    where: { teamId },
    _sum: { amount: true },
  });
  return r._sum.amount ?? 0;
}
