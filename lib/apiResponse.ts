import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "./errors";
import { logger } from "./logger";

export interface SuccessBody<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: { field?: string; message: string }[];
  };
}

export function ok<T>(data: T, init?: { status?: number; message?: string }) {
  return NextResponse.json<SuccessBody<T>>(
    { success: true, data, message: init?.message },
    { status: init?.status ?? 200 }
  );
}

export function created<T>(data: T, message?: string) {
  return ok(data, { status: 201, message });
}

export function fail(error: ApiError) {
  return NextResponse.json<ErrorBody>(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    },
    { status: error.status }
  );
}

// Wrap a route handler so thrown errors become consistent JSON responses.
// Zod errors → 400 with field-level details. Prisma known errors → mapped to
// 404/409/400 where it makes sense. Anything else → 500 with a generic message.
export function handle<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>
): (...args: TArgs) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        return fail(error);
      }

      if (error instanceof ZodError) {
        return NextResponse.json<ErrorBody>(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Request body is invalid",
              details: error.issues.map((i) => ({
                field: i.path.join("."),
                message: i.message,
              })),
            },
          },
          { status: 400 }
        );
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: unique constraint, P2025: record not found, P2003: FK violation
        if (error.code === "P2002") {
          return NextResponse.json<ErrorBody>(
            {
              success: false,
              error: {
                code: "CONFLICT",
                message: "A record with these values already exists",
                details: Array.isArray(error.meta?.target)
                  ? (error.meta!.target as string[]).map((field) => ({
                      field,
                      message: "Must be unique",
                    }))
                  : undefined,
              },
            },
            { status: 409 }
          );
        }
        if (error.code === "P2025") {
          return NextResponse.json<ErrorBody>(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "Record not found" },
            },
            { status: 404 }
          );
        }
        if (error.code === "P2003") {
          return NextResponse.json<ErrorBody>(
            {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: "Referenced record does not exist",
              },
            },
            { status: 400 }
          );
        }
      }

      logger.error("Unhandled API error", { error });
      return NextResponse.json<ErrorBody>(
        {
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        },
        { status: 500 }
      );
    }
  };
}
