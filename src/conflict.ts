export interface AgentVote {
  agent: string;
  decision: string;
  confidence: number; // 0-1
  reasoning: string;
  timestamp: string;
}

export interface ConflictResolution {
  topic: string;
  votes: AgentVote[];
  winner: string;
  method: "majority" | "weighted" | "confidence" | "tiebreak";
  confidence: number;
  resolvedAt: string;
}

export type ResolutionMethod = "majority" | "weighted" | "confidence" | "tiebreak";

export interface ConflictConfig {
  defaultMethod?: ResolutionMethod;
  minConfidence?: number;
  tiebreakOrder?: string[]; // Agent priority for tiebreaking
}

export class ConflictResolver {
  private conflicts: Map<string, AgentVote[]> = new Map();
  private resolutions: ConflictResolution[] = [];
  private config: ConflictConfig;

  constructor(config: ConflictConfig = {}) {
    this.config = {
      defaultMethod: "weighted",
      minConfidence: 0.6,
      tiebreakOrder: [],
      ...config,
    };
  }

  addVote(topic: string, agent: string, decision: string, confidence: number, reasoning: string): void {
    if (!this.conflicts.has(topic)) {
      this.conflicts.set(topic, []);
    }

    const votes = this.conflicts.get(topic)!;
    // Remove existing vote from same agent
    const existingIdx = votes.findIndex((v) => v.agent === agent);
    if (existingIdx >= 0) votes.splice(existingIdx, 1);

    votes.push({
      agent,
      decision,
      confidence: Math.max(0, Math.min(1, confidence)),
      reasoning,
      timestamp: new Date().toISOString(),
    });
  }

  getVotes(topic: string): AgentVote[] {
    return this.conflicts.get(topic) || [];
  }

  hasConflict(topic: string): boolean {
    const votes = this.conflicts.get(topic) || [];
    if (votes.length < 2) return false;
    const decisions = new Set(votes.map((v) => v.decision));
    return decisions.size > 1;
  }

  resolve(topic: string, method?: ResolutionMethod): ConflictResolution | null {
    const votes = this.conflicts.get(topic);
    if (!votes || votes.length === 0) return null;

    const resolvedMethod = method || this.config.defaultMethod!;
    let winner: string;
    let confidence: number;

    switch (resolvedMethod) {
      case "majority": {
        const counts = new Map<string, number>();
        for (const v of votes) {
          counts.set(v.decision, (counts.get(v.decision) || 0) + 1);
        }
        let maxCount = 0;
        for (const [decision, count] of counts) {
          if (count > maxCount) {
            maxCount = count;
            winner = decision;
          }
        }
        confidence = maxCount / votes.length;
        break;
      }

      case "weighted": {
        const scores = new Map<string, number>();
        for (const v of votes) {
          scores.set(v.decision, (scores.get(v.decision) || 0) + v.confidence);
        }
        let maxScore = 0;
        for (const [decision, score] of scores) {
          if (score > maxScore) {
            maxScore = score;
            winner = decision;
          }
        }
        confidence = maxScore / votes.length;
        break;
      }

      case "confidence": {
        let bestVote = votes[0];
        for (const v of votes) {
          if (v.confidence > bestVote.confidence) {
            bestVote = v;
          }
        }
        winner = bestVote.decision;
        confidence = bestVote.confidence;
        break;
      }

      case "tiebreak": {
        const counts = new Map<string, number>();
        for (const v of votes) {
          counts.set(v.decision, (counts.get(v.decision) || 0) + 1);
        }

        const maxCount = Math.max(...counts.values());
        const tied = Array.from(counts.entries())
          .filter(([, c]) => c === maxCount)
          .map(([d]) => d);

        if (tied.length === 1) {
          winner = tied[0];
          confidence = maxCount / votes.length;
        } else {
          // Use tiebreak order
          const order = this.config.tiebreakOrder || [];
          winner = tied[0]; // Default to first
          for (const agent of order) {
            const vote = votes.find((v) => v.agent === agent && tied.includes(v.decision));
            if (vote) {
              winner = vote.decision;
              break;
            }
          }
          confidence = 0.5; // Low confidence for tiebreak
        }
        break;
      }

      default:
        winner = votes[0].decision;
        confidence = votes[0].confidence;
    }

    const resolution: ConflictResolution = {
      topic,
      votes: [...votes],
      winner: winner!,
      method: resolvedMethod,
      confidence,
      resolvedAt: new Date().toISOString(),
    };

    this.resolutions.push(resolution);
    return resolution;
  }

  getResolution(topic: string): ConflictResolution | undefined {
    return this.resolutions.find((r) => r.topic === topic);
  }

  getAllResolutions(): ConflictResolution[] {
    return [...this.resolutions];
  }

  getUnresolvedConflicts(): string[] {
    return Array.from(this.conflicts.keys()).filter((t) => !this.resolutions.find((r) => r.topic === t));
  }

  mergeDecisions(topic: string): string | null {
    const votes = this.conflicts.get(topic);
    if (!votes || votes.length === 0) return null;

    // Find common ground between similar decisions
    const decisions = votes.map((v) => v.decision.toLowerCase());
    const words = decisions.join(" ").split(/\s+/);
    const freq = new Map<string, number>();
    for (const w of words) {
      if (w.length > 3) freq.set(w, (freq.get(w) || 0) + 1);
    }

    // Build merged decision from most common terms
    const sorted = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([w]) => w);

    return sorted.length > 0 ? sorted.join(" ") : null;
  }
}