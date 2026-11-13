export type Tier = "elite" | "gold" | "silver" | "bronze";

export function tier(overall: number): Tier {
  if (overall >= 86) return "elite";
  if (overall >= 80) return "gold";
  if (overall >= 70) return "silver";
  return "bronze";
}
