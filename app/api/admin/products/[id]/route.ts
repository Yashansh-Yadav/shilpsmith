import { prisma } from "../../../../../lib/prisma";

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function generateSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        images: true
      },

      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const slug = generateSlug(body.name);

    const product = await prisma.product.create({
      data: {
        name: body.name,

        slug: slug,

        shortDescription:
          body.shortDescription ||
          body.description,

        description: body.description,

        price: body.price,

        discountPrice:
          body.discountPrice || null,

        customizable:
          body.customizable || false,

        featured:
          body.featured || false,

        stockStatus:
          body.stockStatus || "in-stock",

        whatsappMessage:
          body.whatsappMessage || "",

        category: {
          connect: {
            slug: body.category
          }
        },

        images: {
          create: [
            {
              url: body.image
            }
          ]
        }
      },

      include: {
        category: true,
        images: true
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}