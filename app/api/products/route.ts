import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
) {
  try {
    const category =
      request.nextUrl.searchParams.get(
        "category"
      );

    const products =
      await prisma.product.findMany({
        where: category
          ? { category }
          : undefined
      });

    return NextResponse.json(products);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to fetch products"
      },
      { status: 500 }
    );
  }
}