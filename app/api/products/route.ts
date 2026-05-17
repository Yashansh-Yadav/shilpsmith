// app/api/products/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getDB } from "../../../lib/db";
import { seedDatabase } from "../../../lib/seed";

export async function GET(
  request: NextRequest
) {
  try {
    // IMPORTANT
    await seedDatabase();

    const db = await getDB();

    const category =
      request.nextUrl.searchParams.get(
        "category"
      );

    let products = [];

    if (category) {
      products = await db.all(
        `
        SELECT * FROM products
        WHERE category = ?
      `,
        [category]
      );
    } else {
      products = await db.all(`
        SELECT * FROM products
      `);
    }

    return NextResponse.json(products);
  } catch (error) {
    console.log(error);

    return NextResponse.json([]);
  }
}