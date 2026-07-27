export interface PlanStep {
  id: string;
  phase: string;
  agent: string;
  action: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped" | "backtracked";
  dependencies: string[];
  result?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  steps: PlanStep[];
  createdAt: string;
  updatedAt: string;
  status: "active" | "completed" | "failed" | "backtracked";
  backtrackCount: number;
  maxBacktracks: number;
}

export interface PlanConfig {
  maxBacktracks?: number;
  allowDynamicInsertion?: boolean;
  requireDependencies?: boolean;
}

export class AdaptivePlanner {
  private plans: Map<string, Plan> = new Map();
  private config: PlanConfig;

  constructor(config: PlanConfig = {}) {
    this.config = {
      maxBacktracks: 3,
      allowDynamicInsertion: true,
      requireDependencies: false,
      ...config,
    };
  }

  createPlan(name: string, steps: Omit<PlanStep, "id" | "status">[]): Plan {
    const plan: Plan = {
      id: `plan-${Date.now()}`,
      name,
      steps: steps.map((s, i) => ({
        ...s,
        id: `step-${i}`,
        status: "pending" as const,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active",
      backtrackCount: 0,
      maxBacktracks: this.config.maxBacktracks!,
    };
    this.plans.set(plan.id, plan);
    return plan;
  }

  getPlan(planId: string): Plan | undefined {
    return this.plans.get(planId);
  }

  getNextStep(planId: string): PlanStep | null {
    const plan = this.plans.get(planId);
    if (!plan || plan.status !== "active") return null;

    for (const step of plan.steps) {
      if (step.status !== "pending") continue;

      // Check dependencies
      const depsMet = step.dependencies.every((depId) => {
        const dep = plan.steps.find((s) => s.id === depId);
        return dep?.status === "completed";
      });

      if (depsMet) return step;
    }

    return null;
  }

  startStep(planId: string, stepId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step || step.status !== "pending") return false;

    step.status = "in_progress";
    step.startedAt = new Date().toISOString();
    plan.updatedAt = new Date().toISOString();
    return true;
  }

  completeStep(planId: string, stepId: string, result: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step || step.status !== "in_progress") return false;

    step.status = "completed";
    step.result = result;
    step.completedAt = new Date().toISOString();
    plan.updatedAt = new Date().toISOString();

    // Check if plan is complete
    const allDone = plan.steps.every((s) => s.status === "completed" || s.status === "skipped");
    if (allDone) {
      plan.status = "completed";
    }

    return true;
  }

  failStep(planId: string, stepId: string, error: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step || step.status !== "in_progress") return false;

    step.status = "failed";
    step.error = error;
    step.completedAt = new Date().toISOString();
    plan.updatedAt = new Date().toISOString();
    plan.status = "failed";
    return true;
  }

  backtrack(planId: string, toStepId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    if (plan.backtrackCount >= plan.maxBacktracks) return false;

    const targetIdx = plan.steps.findIndex((s) => s.id === toStepId);
    if (targetIdx < 0) return false;

    // Reset all steps after target
    for (let i = targetIdx; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (step.status === "completed" || step.status === "failed" || step.status === "in_progress") {
        step.status = "backtracked";
        step.completedAt = undefined;
        step.result = undefined;
        step.error = undefined;
      }
    }

    plan.backtrackCount++;
    plan.status = "active";
    plan.updatedAt = new Date().toISOString();
    return true;
  }

  insertStepAfter(planId: string, afterStepId: string, newStep: Omit<PlanStep, "id" | "status">): PlanStep | null {
    const plan = this.plans.get(planId);
    if (!plan || !this.config.allowDynamicInsertion) return null;

    const afterIdx = plan.steps.findIndex((s) => s.id === afterStepId);
    if (afterIdx < 0) return null;

    const step: PlanStep = {
      ...newStep,
      id: `step-${plan.steps.length}`,
      status: "pending",
    };

    plan.steps.splice(afterIdx + 1, 0, step);
    plan.updatedAt = new Date().toISOString();
    return step;
  }

  skipStep(planId: string, stepId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step || step.status !== "pending") return false;

    step.status = "skipped";
    plan.updatedAt = new Date().toISOString();
    return true;
  }

  getProgress(planId: string): { completed: number; total: number; percent: number } {
    const plan = this.plans.get(planId);
    if (!plan) return { completed: 0, total: 0, percent: 0 };

    const completed = plan.steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
    return {
      completed,
      total: plan.steps.length,
      percent: (completed / plan.steps.length) * 100,
    };
  }

  getFailedSteps(planId: string): PlanStep[] {
    const plan = this.plans.get(planId);
    if (!plan) return [];
    return plan.steps.filter((s) => s.status === "failed");
  }

  canBacktrack(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    return plan.backtrackCount < plan.maxBacktracks;
  }
}