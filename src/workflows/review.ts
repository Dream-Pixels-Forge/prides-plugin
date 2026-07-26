import {
  createWorkflowRunner,
  type WorkflowStep,
  type WorkflowStepResult,
} from "./base";

export type ReviewStep = WorkflowStep;
export type ReviewStepResult = WorkflowStepResult;

export const REVIEW_SEQUENCE: readonly ReviewStep[] = [
  {
    agent: "review-critic",
    command: "review",
    description: "Critical analysis and constructive feedback",
  },
  {
    agent: "review-inspector",
    command: "inspect",
    description: "Code quality and QA inspection",
  },
  {
    agent: "review-git-expert",
    command: "commit",
    description: "Version control and commit management",
  },
  {
    agent: "review-silent-failure-hunter",
    command: "audit",
    description: "Identify silent failures and error handling gaps",
  },
];

const runner = createWorkflowRunner(REVIEW_SEQUENCE, "review-steps.json");

export const getReviewSequence = runner.getSequence;
export const getReviewStepByCommand = runner.getStepByCommand;
export const getReviewStepByAgent = runner.getStepByAgent;
export const runReviewStep = runner.runStep;
export const loadReviewLogs = runner.loadLogs;