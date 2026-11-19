"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorText } from "./api";

export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    setLoading(true);
    api<T>(path)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => {
        if (!cancelled) toast.error(errorText(e), { id: "api-fetch-error" });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [path]);

  return { data, loading, setData };
}
