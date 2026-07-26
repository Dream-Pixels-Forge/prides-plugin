import {
  createWorkflowRunner,
  type WorkflowStep,
  type WorkflowStepResult,
} from "./base";

export type SecureStep = WorkflowStep;
export type SecureStepResult = WorkflowStepResult;

export const SECURE_SEQUENCE: readonly SecureStep[] = [
  {
    agent: "secure-agent",
    command: "secure",
    description: "Security audits and vulnerability assessment",
  },
  {
    agent: "secure-architect",
    command: "security-audit",
    description: "Secure architecture design and patterns",
  },
];

const runner = createWorkflowRunner(SECURE_SEQUENCE, "secure-steps.json");

export const getSecureSequence = runner.getSequence;
export const getSecureStepByCommand = runner.getStepByCommand;
export const getSecureStepByAgent = runner.getStepByAgent;
export const runSecureStep = runner.runStep;
export const loadSecureLogs = runner.loadLogs;