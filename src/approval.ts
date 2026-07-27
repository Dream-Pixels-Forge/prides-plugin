export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ApprovalCheckpoint {
  id: string;
  agent: string;
  phase: string;
  action: string;
  riskLevel: RiskLevel;
  description: string;
  proposedChanges?: string[];
  timestamp: string;
  status: "pending" | "approved" | "rejected" | "timeout";
  respondedAt?: string;
  responseBy?: string;
  reason?: string;
}

export interface CheckpointConfig {
  requireApprovalFor?: RiskLevel[];
  timeoutMs?: number;
  autoApproveLowRisk?: boolean;
}

const DEFAULT_CRITICAL_PHASES = [
  "deploy",
  "infrastructure",
  "production",
  "security",
  "database",
  "auth",
  "payment",
  "pii",
  "secrets",
];

const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];

export function assessRisk(action: string, phase: string): RiskLevel {
  const combined = `${action} ${phase}`.toLowerCase();

  if (DEFAULT_CRITICAL_PHASES.some((p) => combined.includes(p))) {
    if (combined.includes("delete") || combined.includes("remove") || combined.includes("drop")) {
      return "critical";
    }
    return "high";
  }

  if (combined.includes("modify") || combined.includes("update") || combined.includes("change")) {
    return "medium";
  }

  if (combined.includes("create") || combined.includes("add") || combined.includes("read")) {
    return "low";
  }

  return "medium";
}

export class HumanApproval {
  private checkpoints: Map<string, ApprovalCheckpoint> = new Map();
  private config: CheckpointConfig;

  constructor(config: CheckpointConfig = {}) {
    this.config = {
      requireApprovalFor: ["high", "critical"],
      timeoutMs: 300000, // 5 minutes
      autoApproveLowRisk: true,
      ...config,
    };
  }

  createCheckpoint(
    agent: string,
    phase: string,
    action: string,
    description: string,
    proposedChanges?: string[]
  ): ApprovalCheckpoint {
    const riskLevel = assessRisk(action, phase);
    const id = `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const checkpoint: ApprovalCheckpoint = {
      id,
      agent,
      phase,
      action,
      riskLevel,
      description,
      proposedChanges,
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    this.checkpoints.set(id, checkpoint);
    return checkpoint;
  }

  needsApproval(checkpoint: ApprovalCheckpoint): boolean {
    if (checkpoint.riskLevel === "low" && this.config.autoApproveLowRisk) {
      return false;
    }
    return this.config.requireApprovalFor!.includes(checkpoint.riskLevel);
  }

  approve(id: string, approver: string, reason?: string): boolean {
    const cp = this.checkpoints.get(id);
    if (!cp || cp.status !== "pending") return false;

    cp.status = "approved";
    cp.respondedAt = new Date().toISOString();
    cp.responseBy = approver;
    cp.reason = reason;
    return true;
  }

  reject(id: string, approver: string, reason: string): boolean {
    const cp = this.checkpoints.get(id);
    if (!cp || cp.status !== "pending") return false;

    cp.status = "rejected";
    cp.respondedAt = new Date().toISOString();
    cp.responseBy = approver;
    cp.reason = reason;
    return true;
  }

  getCheckpoint(id: string): ApprovalCheckpoint | undefined {
    return this.checkpoints.get(id);
  }

  getPendingCheckpoints(): ApprovalCheckpoint[] {
    return Array.from(this.checkpoints.values()).filter((cp) => cp.status === "pending");
  }

  getAllCheckpoints(): ApprovalCheckpoint[] {
    return Array.from(this.checkpoints.values());
  }

  formatCheckpointPrompt(checkpoint: ApprovalCheckpoint): string {
    const riskEmoji = { low: "[LOW]", medium: "[MEDIUM]", high: "[HIGH]", critical: "[CRITICAL]" };
    let prompt = `${riskEmoji[checkpoint.riskLevel]} APPROVAL REQUIRED\n`;
    prompt += `Agent: ${checkpoint.agent}\n`;
    prompt += `Phase: ${checkpoint.phase}\n`;
    prompt += `Action: ${checkpoint.action}\n`;
    prompt += `Risk: ${checkpoint.riskLevel.toUpperCase()}\n\n`;
    prompt += `${checkpoint.description}\n`;

    if (checkpoint.proposedChanges && checkpoint.proposedChanges.length > 0) {
      prompt += `\nProposed Changes:\n`;
      for (const change of checkpoint.proposedChanges) {
        prompt += `  - ${change}\n`;
      }
    }

    prompt += `\nReply with: approve [reason] or reject [reason]`;
    return prompt;
  }
}