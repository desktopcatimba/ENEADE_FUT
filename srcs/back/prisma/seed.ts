import { PrismaClient } from "@prisma/client";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import path from "node:path";

const prisma = new PrismaClient();

// [overall, comprar, vender(50%)] — tabela do PDF "Liga dos 6 Clubes"
const PRICES: [number, number, number][] = [
  [60,20,10],[61,35,17],[62,40,20],[63,45,22],[64,50,25],[65,55,27],[66,60,30],[67,68,34],
  [68,76,38],[69,84,42],[70,92,46],[71,100,50],[72,108,54],[73,117,58],[74,126,63],[75,135,67],
  [76,142,71],[77,150,75],[78,157,78],[79,163,81],[80,170,85],[81,190,95],[82,215,107],[83,240,120],
  [84,270,135],[85,300,150],[86,335,167],[87,370,185],[88,410,205],[89,455,227],[90,500,250],[91,550,275],
];

async function seedPrices() {
  for (const [overall, buyPrice, sellPrice] of PRICES) {
    await prisma.priceTier.upsert({
      where: { overall },
      update: { buyPrice, sellPrice },
      create: { overall, buyPrice, sellPrice },
    });
  }
  console.log(`Price tiers: ${PRICES.length}`);
}

async function seedPlayers() {
  const file = path.join(__dirname, "..", "data", "players_fifa23_24.ndjson.gz");
  const rl = createInterface({ input: createReadStream(file).pipe(createGunzip()), crlfDelay: Infinity });
  let batch: any[] = [];
  let total = 0;
  const flush = async () => {
    if (!batch.length) return;
    await prisma.basePlayer.createMany({ data: batch, skipDuplicates: true });
    total += batch.length;
    batch = [];
    process.stdout.write(`\rPlayers: ${total}`);
  };
  for await (const line of rl) {
    if (!line.trim()) continue;
    batch.push(JSON.parse(line));
    if (batch.length >= 1000) await flush();
  }
  await flush();
  console.log("\nPlayers imported.");
}

async function main() {
  await seedPrices();
  await seedPlayers();
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
