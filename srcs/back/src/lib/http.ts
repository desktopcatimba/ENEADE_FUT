import type { ZodType } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function parse<T>(schema: ZodType<T>, data: unknown): T {
  return schema.parse(data);
}
