import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";

import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";
import { parseJson } from "../../../../lib/middleware/validateRequest";
import { SettingsUpsertSchema } from "../../../../lib/validators";
import { ValidationError } from "../../../../lib/errors";
import { SOCIAL_CACHE_TAG } from "../../../../lib/settings";
import { SOCIAL_PLATFORMS, normalizeSocialUrl } from "../../../../lib/social";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const rows = await prisma.settings.findMany({ orderBy: { key: "asc" } });
  return ok(rows);
});

export const PUT = handle(async (request: NextRequest) => {
  const input = await parseJson(request, SettingsUpsertSchema);

  // The `social` section feeds Organization `sameAs`, where a broken URL is
  // worse than no URL — it tells crawlers the brand claims a profile that
  // doesn't resolve. Validate here so the admin gets told, instead of the link
  // being silently dropped at render time. Values are stored normalized
  // ("instagram.com/x" → "https://instagram.com/x").
  let value = input.value;
  if (input.key === "social") {
    const raw = (value ?? {}) as Record<string, unknown>;
    const normalized: Record<string, string> = {};
    const problems: { field: string; message: string }[] = [];

    for (const platform of SOCIAL_PLATFORMS) {
      const entry = raw[platform.key];
      if (entry == null || String(entry).trim() === "") continue;
      const url = normalizeSocialUrl(entry);
      if (!url) {
        problems.push({
          field: platform.key,
          message: `Enter a full profile URL, e.g. ${platform.placeholder}`,
        });
        continue;
      }
      normalized[platform.key] = url;
    }

    if (problems.length > 0) {
      throw new ValidationError("Some profile URLs are not valid", problems);
    }
    value = normalized;
  }

  const row = await prisma.settings.upsert({
    where: { key: input.key },
    update: { value: value as Prisma.InputJsonValue },
    create: { key: input.key, value: value as Prisma.InputJsonValue },
  });

  // Footer + JSON-LD read this through a tagged cache; drop it so the change is
  // live immediately rather than up to 5 minutes later.
  if (input.key === "social") revalidateTag(SOCIAL_CACHE_TAG);

  return ok(row, { message: "Setting saved" });
});
