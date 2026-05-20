type Level = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): Level {
  const raw = (process.env.LOG_LEVEL || "").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: Level): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel()];
}

function format(level: Level, message: string, context?: LogContext): string {
  const base = { ts: new Date().toISOString(), level, message };
  return JSON.stringify(context ? { ...base, ...context } : base);
}

function emit(level: Level, message: string, context?: LogContext) {
  if (!shouldLog(level)) return;
  const line = format(level, message, context);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    emit("debug", message, context),
  info: (message: string, context?: LogContext) =>
    emit("info", message, context),
  warn: (message: string, context?: LogContext) =>
    emit("warn", message, context),
  error: (message: string, context?: LogContext) => {
    if (context?.error instanceof Error) {
      emit("error", message, {
        ...context,
        error: {
          name: context.error.name,
          message: context.error.message,
          stack: context.error.stack,
        },
      });
    } else {
      emit("error", message, context);
    }
    // Sentry hook point: when SENTRY_DSN is configured, forward here.
    // import * as Sentry from "@sentry/nextjs";
    // if (context?.error instanceof Error) Sentry.captureException(context.error);
  },
};
