import { PipelineLogger } from "./logging";

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalLatencyMs: number;
}

const DEFAULT_RETRYABLE_ERRORS = [
  "rate_limit",
  "timeout",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "502",
  "503",
  "504",
  "429",
];

export async function withRetry<T>(
  fn: () => Promise<T>,
  agent: string,
  config: Partial<RetryConfig> = {},
  logger?: PipelineLogger
): Promise<RetryResult<T>> {
  const fullConfig: Required<RetryConfig> = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: DEFAULT_RETRYABLE_ERRORS,
    ...config,
  };

  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= fullConfig.maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        logger?.info(agent, `Succeeded after ${attempt} attempts`, { attempt, totalLatencyMs: Date.now() - startTime });
      }
      return { success: true, result, attempts: attempt, totalLatencyMs: Date.now() - startTime };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable = fullConfig.retryableErrors.some((e) =>
        lastError!.message.includes(e) || lastError!.name.includes(e)
      );

      if (attempt > fullConfig.maxRetries || !isRetryable) {
        logger?.error(agent, `Failed after ${attempt} attempts: ${lastError.message}`, lastError, { attempt });
        return { success: false, error: lastError, attempts: attempt, totalLatencyMs: Date.now() - startTime };
      }

      const delay = Math.min(
        fullConfig.baseDelayMs * Math.pow(fullConfig.backoffMultiplier, attempt - 1),
        fullConfig.maxDelayMs
      );

      logger?.warn(agent, `Attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`, { attempt, delayMs: delay });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { success: false, error: lastError, attempts: fullConfig.maxRetries + 1, totalLatencyMs: Date.now() - startTime };
}

export function isRetryableError(error: Error): boolean {
  return DEFAULT_RETRYABLE_ERRORS.some((e) => error.message.includes(e) || error.name.includes(e));
}