export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? "Sem ligação à API", data?.details);
  return data as T;
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    return e.details?.length ? e.details.map((d) => `${d.field}: ${d.message}`).join(". ") : e.message;
  }
  return "Algo correu mal. Tenta outra vez.";
}
