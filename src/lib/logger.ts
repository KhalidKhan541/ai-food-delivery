type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, context));
    }
  },

  info(message: string, context?: LogContext) {
    if (shouldLog("info")) {
      console.log(formatMessage("info", message, context));
    }
  },

  warn(message: string, context?: LogContext) {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, context));
    }
  },

  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (shouldLog("error")) {
      const errorContext = {
        ...context,
        ...(error instanceof Error
          ? {
              errorName: error.name,
              errorMessage: error.message,
              stack: error.stack,
            }
          : { error: String(error) }),
      };
      console.error(formatMessage("error", message, errorContext));
    }
  },

  child(context: LogContext) {
    return {
      debug: (message: string, extra?: LogContext) =>
        logger.debug(message, { ...context, ...extra }),
      info: (message: string, extra?: LogContext) =>
        logger.info(message, { ...context, ...extra }),
      warn: (message: string, extra?: LogContext) =>
        logger.warn(message, { ...context, ...extra }),
      error: (message: string, error?: Error | unknown, extra?: LogContext) =>
        logger.error(message, error, { ...context, ...extra }),
    };
  },
};
