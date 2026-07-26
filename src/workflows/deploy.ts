import {
  createWorkflowRunner,
  type WorkflowStep,
  type WorkflowStepResult,
} from "./base";

export type DeployStep = WorkflowStep;
export type DeployStepResult = WorkflowStepResult;

export const DEPLOY_SEQUENCE: readonly DeployStep[] = [
  {
    agent: "deploy-agent",
    command: "deploy",
    description: "Deployment and infrastructure management",
  },
  {
    agent: "deploy-performance",
    command: "performance",
    description: "Performance optimization and monitoring",
  },
];

const runner = createWorkflowRunner(DEPLOY_SEQUENCE, "deploy-steps.json");

export const getDeploySequence = runner.getSequence;
export const getDeployStepByCommand = runner.getStepByCommand;
export const getDeployStepByAgent = runner.getStepByAgent;
export const runDeployStep = runner.runStep;
export const loadDeployLogs = runner.loadLogs;