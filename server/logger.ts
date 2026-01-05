type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogMetadata {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  metadata?: LogMetadata;
  duration?: number;
  requestId?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  DEBUG: "\x1b[36m",
  INFO: "\x1b[32m",
  WARN: "\x1b[33m",
  ERROR: "\x1b[31m",
};

const RESET_COLOR = "\x1b[0m";
const DIM_COLOR = "\x1b[2m";
const BRIGHT_COLOR = "\x1b[1m";

class Logger {
  private minLevel: LogLevel;
  private useColors: boolean;

  constructor() {
    const envLevel = (process.env.LOG_LEVEL || "INFO").toUpperCase() as LogLevel;
    this.minLevel = LOG_LEVELS[envLevel] !== undefined ? envLevel : "INFO";
    this.useColors = process.stdout.isTTY ?? true;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMetadata(metadata?: LogMetadata): string {
    if (!metadata || Object.keys(metadata).length === 0) {
      return "";
    }

    try {
      const formatted = JSON.stringify(metadata, (_, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      }, 2);
      return `\n${formatted}`;
    } catch {
      return `\n[Unserializable metadata]`;
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, source, message, metadata, duration, requestId } = entry;

    let output = "";

    if (this.useColors) {
      const color = LOG_COLORS[level];
      output += `${DIM_COLOR}${timestamp}${RESET_COLOR} `;
      output += `${color}[${level.padEnd(5)}]${RESET_COLOR} `;
      output += `${BRIGHT_COLOR}[${source}]${RESET_COLOR} `;
      output += message;
    } else {
      output += `${timestamp} [${level.padEnd(5)}] [${source}] ${message}`;
    }

    if (requestId) {
      output += ` (reqId: ${requestId})`;
    }

    if (duration !== undefined) {
      output += ` (${duration}ms)`;
    }

    if (metadata) {
      const metaStr = this.formatMetadata(metadata);
      if (this.useColors && metaStr) {
        output += `${DIM_COLOR}${metaStr}${RESET_COLOR}`;
      } else {
        output += metaStr;
      }
    }

    return output;
  }

  private log(level: LogLevel, source: string, message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      source,
      message,
      metadata,
    };

    const formatted = this.formatLogEntry(entry);

    switch (level) {
      case "ERROR":
        console.error(formatted);
        break;
      case "WARN":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(source: string, message: string, metadata?: LogMetadata): void {
    this.log("DEBUG", source, message, metadata);
  }

  info(source: string, message: string, metadata?: LogMetadata): void {
    this.log("INFO", source, message, metadata);
  }

  warn(source: string, message: string, metadata?: LogMetadata): void {
    this.log("WARN", source, message, metadata);
  }

  error(source: string, message: string, metadata?: LogMetadata): void {
    this.log("ERROR", source, message, metadata);
  }

  http(method: string, path: string, statusCode: number, duration: number, metadata?: LogMetadata): void {
    const level: LogLevel = statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARN" : "INFO";
    const message = `${method} ${path} ${statusCode}`;
    
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      source: "HTTP",
      message,
      duration,
      metadata,
    };

    const formatted = this.formatLogEntry(entry);

    switch (level) {
      case "ERROR":
        console.error(formatted);
        break;
      case "WARN":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  audit(action: string, details: LogMetadata): void {
    this.info("AUDIT", action, details);
  }

  storage(operation: string, details?: LogMetadata): void {
    this.debug("STORAGE", operation, details);
  }

  validation(success: boolean, details?: LogMetadata): void {
    if (success) {
      this.debug("VALIDATION", "Validation passed", details);
    } else {
      this.warn("VALIDATION", "Validation failed", details);
    }
  }

  startup(message: string, details?: LogMetadata): void {
    this.info("STARTUP", message, details);
  }

  security(event: string, details?: LogMetadata): void {
    this.warn("SECURITY", event, details);
  }

  performance(operation: string, duration: number, details?: LogMetadata): void {
    const level: LogLevel = duration > 1000 ? "WARN" : "DEBUG";
    this.log(level, "PERF", `${operation} completed`, { ...details, duration });
  }
}

export const logger = new Logger();

export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const path = req.path;
    const method = req.method;

    let capturedResponseBody: any = undefined;

    const originalJson = res.json;
    res.json = function (body: any) {
      capturedResponseBody = body;
      return originalJson.apply(res, [body]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;

      if (path.startsWith("/api")) {
        const metadata: LogMetadata = {};

        if (Object.keys(req.query).length > 0) {
          metadata.query = req.query;
        }

        if (method === "POST" || method === "PATCH" || method === "PUT") {
          if (req.body && Object.keys(req.body).length > 0) {
            const sanitizedBody = { ...req.body };
            const sensitiveFields = ["password", "token", "secret", "apiKey", "authorization"];
            for (const field of sensitiveFields) {
              if (sanitizedBody[field]) {
                sanitizedBody[field] = "[REDACTED]";
              }
            }
            metadata.body = sanitizedBody;
          }
        }

        if (res.statusCode >= 400 && capturedResponseBody) {
          metadata.response = capturedResponseBody;
        }

        logger.http(method, path, res.statusCode, duration, 
          Object.keys(metadata).length > 0 ? metadata : undefined
        );
      }
    });

    next();
  };
}

export default logger;
