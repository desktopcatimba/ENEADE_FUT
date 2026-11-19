"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError, api, errorText } from "@/lib/api";
import type { Team, User } from "@/lib/types";

type Ctx = {
  user: User | null;
  team: Team | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User; team: Team | null; selectedTeam: Team | null }>("/auth/me");
      setUser(r.user);
      setTeam(r.selectedTeam ?? r.team ?? null);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        toast.error(errorText(error), { id: "auth-refresh-error" });
      }
      setUser(null);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
      toast.success("Sessão terminada.");
    } catch (error) {
      toast.error(errorText(error));
    }
    setUser(null);
    setTeam(null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return <AuthContext.Provider value={{ user, team, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}
