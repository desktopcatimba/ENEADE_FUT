"use client";

import { useAuth } from "@/components/AuthProvider";

export default function ProfilePage() {
  const { user, team } = useAuth();

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Perfil</p>
        <h1 className="font-display text-4xl font-bold text-turf-dark">A minha conta</h1>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
        <div>
          <p className="text-sm text-slate-500">Nome</p>
          <p className="text-xl font-bold text-slate-800">{user?.name ?? "-"}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Email</p>
          <p className="text-xl font-bold text-slate-800">{user?.email ?? "-"}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Função</p>
          <p className="text-xl font-bold text-slate-800">{user?.role ?? "USER"}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Equipa ativa</p>
          <p className="text-xl font-bold text-slate-800">{team?.name ?? "Nenhuma selecionada"}</p>
        </div>
      </div>
    </div>
  );
}
