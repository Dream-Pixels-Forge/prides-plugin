import {
  createWorkflowRunner,
  type WorkflowStep,
  type WorkflowStepResult,
} from "./base";

export type PrototypeStep = WorkflowStep;
export type PrototypeStepResult = WorkflowStepResult;

export const PROTOTYPE_SEQUENCE: readonly PrototypeStep[] = [
  {
    agent: "prototype-idea",
    command: "init",
    description: "Generate creative ideas and brainstorm concepts",
  },
  {
    agent: "prototype-analyst",
    command: "analyze-requirements",
    description: "Analyze requirements and assess feasibility",
  },
  {
    agent: "prototype-prd",
    command: "create-prd",
    description: "Create Product Requirements Document",
  },
  {
    agent: "prototype-plan",
    command: "plan",
    description: "Design implementation plan and architecture",
  },
  {
    agent: "prototype-agent",
    command: "prototype",
    description: "Build rapid prototype and PoC",
  },
];

const runner = createWorkflowRunner(PROTOTYPE_SEQUENCE, "prototype-steps.json");

export const getPrototypeSequence = runner.getSequence;
export const getPrototypeStepByCommand = runner.getStepByCommand;
export const getPrototypeStepByAgent = runner.getStepByAgent;
export const runPrototypeStep = runner.runStep;
export const loadPrototypeLogs = runner.loadLogs;