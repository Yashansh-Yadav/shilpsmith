import { prisma } from "../../../../lib/prisma";

import { NextRequest, NextResponse } from "next/server";

function generateSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const category = await prisma.category.create({
      data: {
        name: body.name,

        slug: generateSlug(body.name),

        description: body.description || "",

        image: body.image || ""
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to create category"
      },
      {
        status: 500
      }
    );
  }
}