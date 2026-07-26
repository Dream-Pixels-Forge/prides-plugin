import * as fs from "fs";
import * as path from "path";

export interface TokenBudgetConfig {
  maxTotalTokens?: number;
  maxTokensPerAgent?: Record<string, number>;
  costPer1kTokens?: Record<string, number>;
  dataDir: string;
  alertThresholdPercent?: number;
}

export interface TokenUsage {
  agent: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  timestamp: string;
}

export interface BudgetStatus {
  totalUsed: number;
  totalBudget: number;
  percentUsed: number;
  costSoFar: number;
  perAgent: Record<string, { used: number; budget: number; cost: number }>;
  alerts: string[];
}

// Default pricing per 1k tokens (approximate)
const DEFAULT_COST: Record<string, number> = {
  "Big Pickle": 0.003,
  "Big Brain": 0.003,
  "Big Picker": 0.003,
  "Hephaestus": 0.003,
  default: 0.003,
};

export class TokenBudget {
  private config: Required<TokenBudgetConfig>;
  private usage: TokenUsage[] = [];
  private alerts: string[] = [];

  constructor(config: TokenBudgetConfig) {
    this.config = {
      maxTotalTokens: 500000,
      maxTokensPerAgent: {},
      costPer1kTokens: DEFAULT_COST,
      alertThresholdPercent: 80,
      ...config,
    };
    this.loadUsage();
  }

  private getUsageFile(): string {
    return path.join(this.config.dataDir, "token-usage.json");
  }

  private loadUsage(): void {
    try {
      const file = this.getUsageFile();
      if (fs.existsSync(file)) {
        this.usage = JSON.parse(fs.readFileSync(file, "utf-8"));
      }
    } catch {
      this.usage = [];
    }
  }

  private saveUsage(): void {
    const file = this.getUsageFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(this.usage, null, 2));
  }

  private getCost(agent: string, tokens: number): number {
    const rate = this.config.costPer1kTokens[agent] || this.config.costPer1kTokens.default || 0.003;
    return (tokens / 1000) * rate;
  }

  recordUsage(agent: string, inputTokens: number, outputTokens: number): TokenUsage {
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = this.getCost(agent, totalTokens);

    const entry: TokenUsage = {
      agent,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      timestamp: new Date().toISOString(),
    };

    this.usage.push(entry);
    this.saveUsage();
    this.checkBudgets();
    return entry;
  }

  private checkBudgets(): void {
    this.alerts = [];
    const status = this.getStatus();

    if (status.percentUsed >= this.config.alertThresholdPercent) {
      this.alerts.push(`Token budget ${status.percentUsed.toFixed(1)}% used (${status.totalUsed}/${status.totalBudget})`);
    }

    for (const [agent, data] of Object.entries(status.perAgent)) {
      if (data.budget > 0 && (data.used / data.budget) * 100 >= this.config.alertThresholdPercent) {
        this.alerts.push(`Agent ${agent} at ${((data.used / data.budget) * 100).toFixed(1)}% of budget`);
      }
    }
  }

  getStatus(): BudgetStatus {
    const totalUsed = this.usage.reduce((sum, u) => sum + u.totalTokens, 0);
    const totalBudget = this.config.maxTotalTokens;
    const costSoFar = this.usage.reduce((sum, u) => sum + u.estimatedCost, 0);

    const perAgent: Record<string, { used: number; budget: number; cost: number }> = {};
    for (const u of this.usage) {
      if (!perAgent[u.agent]) {
        perAgent[u.agent] = {
          used: 0,
          budget: this.config.maxTokensPerAgent[u.agent] || 0,
          cost: 0,
        };
      }
      perAgent[u.agent].used += u.totalTokens;
      perAgent[u.agent].cost += u.estimatedCost;
    }

    return {
      totalUsed,
      totalBudget,
      percentUsed: (totalUsed / totalBudget) * 100,
      costSoFar,
      perAgent,
      alerts: [...this.alerts],
    };
  }

  canAfford(agent: string, estimatedTokens: number): boolean {
    const status = this.getStatus();
    if (status.totalUsed + estimatedTokens > this.config.maxTotalTokens) return false;

    const agentBudget = this.config.maxTokensPerAgent[agent];
    if (agentBudget) {
      const agentUsed = status.perAgent[agent]?.used || 0;
      if (agentUsed + estimatedTokens > agentBudget) return false;
    }

    return true;
  }

  getAlerts(): string[] {
    return [...this.alerts];
  }

  reset(): void {
    this.usage = [];
    this.alerts = [];
    this.saveUsage();
  }

  getHistory(agent?: string): TokenUsage[] {
    if (agent) return this.usage.filter((u) => u.agent === agent);
    return [...this.usage];
  }
}