export type User = { id: string; name: string; email: string; role: string; selectedTeamId?: string | null };
export type Team = {
  id: string;
  name: string;
  crest: string | null;
  formation: string;
  ownerId?: string | null;
  userId?: string | null;
  league?: string | null;
  nationality?: string | null;
  overall?: number | null;
  stadium?: string | null;
  coachId?: number | null;
  catalogTeamId?: number | null;
};

export type TeamPlayerSummary = {
  id: string;
  teamId: string;
  displayName?: string | null;
  overall: number;
  position: string;
  attrs: Record<string, number | null>;
  basePlayer: {
    id: number;
    shortName: string;
    longName: string;
    positions: string[];
    overall: number;
    age: number | null;
    clubName: string | null;
    nationality: string | null;
    potential: number;
  };
};

export type TransferItem = {
  id: string;
  type: "BUY" | "SELL" | "AUCTION";
  playerName: string;
  club: string;
  price: number;
  status: string;
};

export type FaceStats = {
  pace: number | null; shooting: number | null; passing: number | null;
  dribbling: number | null; defending: number | null; physic: number | null;
};

export type PlayerListItem = {
  id: number; fifaVersion: number; shortName: string; longName: string; positions: string[];
  overall: number; potential: number; age: number | null; clubName: string | null;
  leagueName: string | null; nationality: string | null; preferredFoot: string | null;
  weakFoot: number | null; skillMoves: number | null; faceStats: FaceStats;
};

export type PlayerDetail = PlayerListItem & {
  heightCm: number | null; weightKg: number | null; workRate: string | null;
  positionRatings: Record<string, number | null>;
  attrGroups: Record<string, Record<string, number | null>>;
};

export type PlayersPage = { page: number; pages: number; total: number; players: PlayerListItem[] };
export type TeamListPage = { page: number; pages: number; total: number; limit: number; teams: Team[] };
export type LedgerEntry = { id: number; type: string; amount: number; description: string | null; createdAt: string };
