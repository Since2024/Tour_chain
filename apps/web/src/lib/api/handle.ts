import { type NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { jsonError } from "./response";

// ── Rate limiter ─────────────────────────────────────────────────────────────
// In-memory sliding-window limiter — works for single-process deployments.
// For multi-instance / serverless production, swap for @upstash/ratelimit.
const _store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = _store.get(key);
  if (!entry || now >= entry.resetAt) {
    _store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── Typed POST handler ───────────────────────────────────────────────────────
// Usage:  export const POST = handle(MySchema, async (body, req) => { ... });
export function handle<T>(
  schema: z.ZodType<T>,
  fn: (body: T, req: NextRequest) => Promise<Response>,
) {
  return async (req: NextRequest): Promise<Response> => {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return jsonError(400, "invalid_json", "Request body must be valid JSON");
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
      return jsonError(400, "validation_error", "Validation failed", result.error.flatten());
    }

    try {
      return await fn(result.data, req);
    } catch (err) {
      if (err instanceof AppError) {
        return jsonError(err.status, err.code, err.message);
      }
      console.error("[api]", err instanceof Error ? err.stack : err);
      return jsonError(500, "internal_error", "An unexpected error occurred");
    }
  };
}

// ── GET / no-body handler ────────────────────────────────────────────────────
// Usage:  export const GET = withErrors(async (req, ctx) => { ... });
export function withErrors<C = unknown>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        return jsonError(err.status, err.code, err.message);
      }
      console.error("[api]", err instanceof Error ? err.stack : err);
      return jsonError(500, "internal_error", "An unexpected error occurred");
    }
  };
}
