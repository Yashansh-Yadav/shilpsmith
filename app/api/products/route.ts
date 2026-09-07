import type { NextRequest } from "next/server";

import { ok, handle } from "../../../lib/apiResponse";
import { parseQuery } from "../../../lib/middleware/validateRequest";
import { ProductSearchQuerySchema } from "../../../lib/validators";
import { searchProducts } from "../../../lib/catalog";

// The query itself lives in lib/catalog.ts so the server-rendered /search page
// and this route return exactly the same shape from the same code path.
export const GET = handle(async (request: NextRequest) => {
  const query = parseQuery(request, ProductSearchQuerySchema);
  return ok(await searchProducts(query));
});
