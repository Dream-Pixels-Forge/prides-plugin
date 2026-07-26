import {
  createWorkflowRunner,
  type WorkflowStep,
  type WorkflowStepResult,
} from "./base";

export type ImplementStep = WorkflowStep;
export type ImplementStepResult = WorkflowStepResult;

export const IMPLEMENT_SEQUENCE: readonly ImplementStep[] = [
  {
    agent: "implement-features",
    command: "new-feature",
    description: "Feature integration and coordination",
  },
  {
    agent: "implement-uiux",
    command: "uiux",
    description: "User interface and experience design",
  },
  {
    agent: "implement-coder",
    command: "refactor",
    description: "Core functionality implementation and refactoring",
  },
  {
    agent: "implement-debugger",
    command: "bug-fix",
    description: "Bug identification and resolution",
  },
  {
    agent: "implement-linter",
    command: "lint",
    description: "Code quality and style enforcement",
  },
  {
    agent: "implement-tasks",
    command: "tasks",
    description: "Task management and workflow coordination",
  },
];

const runner = createWorkflowRunner(
  IMPLEMENT_SEQUENCE,
  "implement-steps.json"
);

export const getImplementSequence = runner.getSequence;
export const getImplementStepByCommand = runner.getStepByCommand;
export const getImplementStepByAgent = runner.getStepByAgent;
export const runImplementStep = runner.runStep;
export const loadImplementLogs = runner.loadLogs;