import {
  createWorkflowRunner,
  type WorkflowStep,
  type WorkflowStepResult,
} from "./base";

export type ExtendStep = WorkflowStep;
export type ExtendStepResult = WorkflowStepResult;

export const EXTEND_SEQUENCE: readonly ExtendStep[] = [
  {
    agent: "extend-architect",
    command: "architect",
    description: "Architecture scalability and future-proofing",
  },
];

const runner = createWorkflowRunner(EXTEND_SEQUENCE, "extend-steps.json");

export const getExtendSequence = runner.getSequence;
export const getExtendStepByCommand = runner.getStepByCommand;
export const getExtendStepByAgent = runner.getStepByAgent;
export const runExtendStep = runner.runStep;
export const loadExtendLogs = runner.loadLogs;