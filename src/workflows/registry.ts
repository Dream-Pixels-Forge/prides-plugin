import { PHASE_ORDER } from "../constants";
import {
  getPrototypeSequence,
  getPrototypeStepByCommand,
  getPrototypeStepByAgent,
  runPrototypeStep,
  loadPrototypeLogs,
  PROTOTYPE_SEQUENCE,
} from "./prototype";
import {
  getReviewSequence,
  getReviewStepByCommand,
  getReviewStepByAgent,
  runReviewStep,
  loadReviewLogs,
  REVIEW_SEQUENCE,
} from "./review";
import {
  getImplementSequence,
  getImplementStepByCommand,
  getImplementStepByAgent,
  runImplementStep,
  loadImplementLogs,
  IMPLEMENT_SEQUENCE,
} from "./implement";
import {
  getDeploySequence,
  getDeployStepByCommand,
  getDeployStepByAgent,
  runDeployStep,
  loadDeployLogs,
  DEPLOY_SEQUENCE,
} from "./deploy";
import {
  getExtendSequence,
  getExtendStepByCommand,
  getExtendStepByAgent,
  runExtendStep,
  loadExtendLogs,
  EXTEND_SEQUENCE,
} from "./extend";
import {
  getSecureSequence,
  getSecureStepByCommand,
  getSecureStepByAgent,
  runSecureStep,
  loadSecureLogs,
  SECURE_SEQUENCE,
} from "./secure";
import type { WorkflowStep, WorkflowStepResult } from "./base";

export interface PhaseRunner {
  phase: string;
  sequence: readonly WorkflowStep[];
  getSequence: () => WorkflowStep[];
  getStepByCommand: (command: string) => WorkflowStep | null;
  getStepByAgent: (agent: string) => WorkflowStep | null;
  runStep: (
    workspaceDir: string,
    stepIndex: number,
    input: string
  ) => Promise<WorkflowStepResult>;
  loadLogs: (workspaceDir: string) => Promise<WorkflowStepResult[]>;
}

const RUNNERS: Record<string, PhaseRunner> = {
  prototype: {
    phase: "prototype",
    sequence: PROTOTYPE_SEQUENCE,
    getSequence: getPrototypeSequence,
    getStepByCommand: getPrototypeStepByCommand,
    getStepByAgent: getPrototypeStepByAgent,
    runStep: runPrototypeStep,
    loadLogs: loadPrototypeLogs,
  },
  review: {
    phase: "review",
    sequence: REVIEW_SEQUENCE,
    getSequence: getReviewSequence,
    getStepByCommand: getReviewStepByCommand,
    getStepByAgent: getReviewStepByAgent,
    runStep: runReviewStep,
    loadLogs: loadReviewLogs,
  },
  implement: {
    phase: "implement",
    sequence: IMPLEMENT_SEQUENCE,
    getSequence: getImplementSequence,
    getStepByCommand: getImplementStepByCommand,
    getStepByAgent: getImplementStepByAgent,
    runStep: runImplementStep,
    loadLogs: loadImplementLogs,
  },
  deploy: {
    phase: "deploy",
    sequence: DEPLOY_SEQUENCE,
    getSequence: getDeploySequence,
    getStepByCommand: getDeployStepByCommand,
    getStepByAgent: getDeployStepByAgent,
    runStep: runDeployStep,
    loadLogs: loadDeployLogs,
  },
  extend: {
    phase: "extend",
    sequence: EXTEND_SEQUENCE,
    getSequence: getExtendSequence,
    getStepByCommand: getExtendStepByCommand,
    getStepByAgent: getExtendStepByAgent,
    runStep: runExtendStep,
    loadLogs: loadExtendLogs,
  },
  secure: {
    phase: "secure",
    sequence: SECURE_SEQUENCE,
    getSequence: getSecureSequence,
    getStepByCommand: getSecureStepByCommand,
    getStepByAgent: getSecureStepByAgent,
    runStep: runSecureStep,
    loadLogs: loadSecureLogs,
  },
};

export function getPhaseRunner(phase: string): PhaseRunner | null {
  return RUNNERS[phase] ?? null;
}

export function getRunnerForCommand(
  command: string
): { phase: string; step: WorkflowStep } | null {
  for (const phase of PHASE_ORDER) {
    const runner = RUNNERS[phase];
    const step = runner.getStepByCommand(command);
    if (step) return { phase, step };
  }
  return null;
}

export function getRunnerForAgent(
  agent: string
): { phase: string; step: WorkflowStep } | null {
  for (const phase of PHASE_ORDER) {
    const runner = RUNNERS[phase];
    const step = runner.getStepByAgent(agent);
    if (step) return { phase, step };
  }
  return null;
}

export async function runPhase(
  workspaceDir: string,
  phase: string,
  input: string
): Promise<{ phase: string; results: WorkflowStepResult[] }> {
  const runner = getPhaseRunner(phase);
  if (!runner) {
    return {
      phase,
      results: [
        {
          agent: "",
          step: -1,
          output: "",
          success: false,
          error: `Unknown phase: ${phase}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  const results: WorkflowStepResult[] = [];
  for (let i = 0; i < runner.sequence.length; i++) {
    const result = await runner.runStep(workspaceDir, i, input);
    results.push(result);
    if (!result.success) break;
  }
  return { phase, results };
}