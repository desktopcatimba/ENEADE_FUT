"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center gap-6 px-5 py-10">
      <h1 className="font-display text-5xl font-bold text-turf-dark">ENEADE FUT</h1>
      {children}
    </main>
  );
}
