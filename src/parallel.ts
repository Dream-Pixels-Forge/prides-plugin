export interface ParallelTask<T> {
  id: string;
  name: string;
  execute: () => Promise<T>;
}

export interface ParallelResult<T> {
  id: string;
  name: string;
  success: boolean;
  result?: T;
  error?: Error;
  latencyMs: number;
}

export interface ParallelConfig {
  maxConcurrency?: number;
  failFast?: boolean;
}

export class ParallelExecutor {
  private config: ParallelConfig;

  constructor(config: ParallelConfig = {}) {
    this.config = {
      maxConcurrency: 5,
      failFast: false,
      ...config,
    };
  }

  async executeAll<T>(tasks: ParallelTask<T>[]): Promise<ParallelResult<T>[]> {
    const results: ParallelResult<T>[] = [];
    const executing: Promise<void>[] = [];
    let taskIndex = 0;
    let hasFailed = false;

    const executeTask = async (task: ParallelTask<T>): Promise<void> => {
      const startTime = Date.now();
      try {
        const result = await task.execute();
        results.push({
          id: task.id,
          name: task.name,
          success: true,
          result,
          latencyMs: Date.now() - startTime,
        });
      } catch (err) {
        if (this.config.failFast) hasFailed = true;
        results.push({
          id: task.id,
          name: task.name,
          success: false,
          error: err instanceof Error ? err : new Error(String(err)),
          latencyMs: Date.now() - startTime,
        });
      }
    };

    while (taskIndex < tasks.length && !hasFailed) {
      while (executing.length < (this.config.maxConcurrency ?? 5) && taskIndex < tasks.length) {
        const task = tasks[taskIndex++];
        const promise = executeTask(task).then(() => {
          executing.splice(executing.indexOf(promise), 1);
        });
        executing.push(promise);
      }

      if (executing.length > 0) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  async executeWithRetry<T>(
    tasks: ParallelTask<T>[],
    maxRetries: number = 2
  ): Promise<ParallelResult<T>[]> {
    const retryTasks = tasks.map((task) => ({
      ...task,
      execute: async (): Promise<T> => {
        let lastError: Error | undefined;
        for (let i = 0; i <= maxRetries; i++) {
          try {
            return await task.execute();
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (i < maxRetries) {
              await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
            }
          }
        }
        throw lastError;
      },
    }));

    return this.executeAll(retryTasks);
  }

  executeWithTimeout<T>(tasks: ParallelTask<T>[], timeoutMs: number): Promise<ParallelResult<T>[]> {
    const timeoutTasks = tasks.map((task) => ({
      ...task,
      execute: async (): Promise<T> => {
        return Promise.race([
          task.execute(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);
      },
    }));

    return this.executeAll(timeoutTasks);
  }

  static groupByDependencies<T extends { id: string; dependencies: string[] }>(
    tasks: T[]
  ): T[][] {
    const layers: T[][] = [];
    const remaining = [...tasks];
    const completed = new Set<string>();

    while (remaining.length > 0) {
      const layer = remaining.filter((t) =>
        t.dependencies.every((d) => completed.has(d))
      );

      if (layer.length === 0) {
        // Circular dependency or error — add remaining as-is
        layers.push([...remaining]);
        break;
      }

      layers.push(layer);
      for (const t of layer) {
        completed.add(t.id);
        remaining.splice(remaining.indexOf(t), 1);
      }
    }

    return layers;
  }
}