import * as fs from "fs";
import * as path from "path";

export interface LogEntry {
  traceId: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  agent: string;
  phase?: string;
  message: string;
  tokens?: { input: number; output: number; total: number };
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}

export interface LoggerConfig {
  logDir: string;
  minLevel?: "debug" | "info" | "warn" | "error";
  maxFileSizeMB?: number;
  maxFiles?: number;
}

const LEVEL_PRIORITY = { debug: 0, info: 1, warn: 2, error: 3 };

export class PipelineLogger {
  private config: Required<LoggerConfig>;
  private traceId: string;
  private entries: LogEntry[] = [];

  constructor(config: LoggerConfig, traceId?: string) {
    this.config = {
      minLevel: "info",
      maxFileSizeMB: 10,
      maxFiles: 5,
      ...config,
    };
    this.traceId = traceId || this.generateTraceId();
  }

  private generateTraceId(): string {
    return `prides-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private shouldLog(level: LogEntry["level"]): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.config.minLevel];
  }

  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    this.entries.push(entry);

    try {
      const logFile = path.join(this.config.logDir, "pipeline.jsonl");
      fs.mkdirSync(this.config.logDir, { recursive: true });
      fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
    } catch {
      // Silent fail for logging — don't break pipeline
    }
  }

  debug(agent: string, message: string, meta?: Record<string, unknown>): void {
    this.write({ traceId: this.traceId, timestamp: new Date().toISOString(), level: "debug", agent, message, metadata: meta });
  }

  info(agent: string, message: string, meta?: Record<string, unknown>): void {
    this.write({ traceId: this.traceId, timestamp: new Date().toISOString(), level: "info", agent, message, metadata: meta });
  }

  warn(agent: string, message: string, meta?: Record<string, unknown>): void {
    this.write({ traceId: this.traceId, timestamp: new Date().toISOString(), level: "warn", agent, message, metadata: meta });
  }

  error(agent: string, message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.write({
      traceId: this.traceId,
      timestamp: new Date().toISOString(),
      level: "error",
      agent,
      message,
      metadata: { ...meta, error: error?.message, stack: error?.stack },
    });
  }

  step(agent: string, phase: string, startTime: number, tokens?: { input: number; output: number }): void {
    const latencyMs = Date.now() - startTime;
    const totalTokens = tokens ? tokens.input + tokens.output : 0;
    this.write({
      traceId: this.traceId,
      timestamp: new Date().toISOString(),
      level: "info",
      agent,
      phase,
      message: `Step completed`,
      tokens: tokens ? { ...tokens, total: totalTokens } : undefined,
      latencyMs,
    });
  }

  getTraceId(): string {
    return this.traceId;
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getSummary(): { totalSteps: number; totalTokens: number; totalLatencyMs: number; errors: number } {
    return this.entries.reduce(
      (acc, e) => ({
        totalSteps: acc.totalSteps + (e.message === "Step completed" ? 1 : 0),
        totalTokens: acc.totalTokens + (e.tokens?.total || 0),
        totalLatencyMs: acc.totalLatencyMs + (e.latencyMs || 0),
        errors: acc.errors + (e.level === "error" ? 1 : 0),
      }),
      { totalSteps: 0, totalTokens: 0, totalLatencyMs: 0, errors: 0 }
    );
  }
}