import type { NextRequest } from "next/server";
import type { ZodTypeAny, infer as zInfer } from "zod";
import { ValidationError } from "../errors";

// Parse and validate a JSON request body. Throws ZodError on failure; the
// `handle()` wrapper in lib/apiResponse turns that into a 400 response.
export async function parseJson<S extends ZodTypeAny>(
  request: NextRequest | Request,
  schema: S
): Promise<zInfer<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
  return schema.parse(body);
}

// Parse and validate query parameters from a URL.
export function parseQuery<S extends ZodTypeAny>(
  request: NextRequest | Request,
  schema: S
): zInfer<S> {
  const url = new URL(request.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return schema.parse(params);
}
