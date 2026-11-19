import serverless from "serverless-http";
import type { NextRequest } from "next/server";
import { app } from "@/server/app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiHandler = serverless(app, { provider: "aws" });

type ApiGatewayResponse = {
  statusCode: number;
  headers?: Record<string, string | number | boolean>;
  multiValueHeaders?: Record<string, Array<string | number | boolean>>;
  cookies?: string[];
  body?: string;
  isBase64Encoded?: boolean;
};

async function handle(request: NextRequest): Promise<Response> {
  const path = request.nextUrl.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  const event: Record<string, unknown> = {
    version: "2.0",
    routeKey: "$default",
    rawPath: path,
    rawQueryString: request.nextUrl.search.slice(1),
    headers: Object.fromEntries(request.headers.entries()),
    requestContext: {
      http: {
        method: request.method,
        path,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: request.headers.get("user-agent") ?? "",
      },
    },
    isBase64Encoded: false,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    event.body = await request.text();
  }

  const result = await apiHandler(event, {}) as ApiGatewayResponse;
  const headers = new Headers();

  for (const [name, value] of Object.entries(result.headers ?? {})) {
    headers.set(name, String(value));
  }
  for (const [name, values] of Object.entries(result.multiValueHeaders ?? {})) {
    for (const value of values) headers.append(name, String(value));
  }
  for (const cookie of result.cookies ?? []) headers.append("set-cookie", cookie);

  const body = result.isBase64Encoded
    ? Buffer.from(result.body ?? "", "base64")
    : result.body ?? null;

  return new Response(result.statusCode === 204 || result.statusCode === 304 ? null : body, {
    status: result.statusCode,
    headers,
  });
}

export const GET = handle;
export const HEAD = handle;
export const OPTIONS = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
