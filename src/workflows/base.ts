import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";

export interface WorkflowStep {
  agent: string;
  command: string;
  description: string;
}

export interface WorkflowStepResult {
  agent: string;
  step: number;
  output: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface WorkflowRunner {
  getSequence(): WorkflowStep[];
  getStepByCommand(command: string): WorkflowStep | null;
  getStepByAgent(agent: string): WorkflowStep | null;
  runStep(
    workspaceDir: string,
    stepIndex: number,
    input: string
  ): Promise<WorkflowStepResult>;
  loadLogs(workspaceDir: string): Promise<WorkflowStepResult[]>;
}

export function createWorkflowRunner(
  sequence: readonly WorkflowStep[],
  logFilename: string
): WorkflowRunner {
  const getSequence = (): WorkflowStep[] => [...sequence];

  const getStepByCommand = (command: string): WorkflowStep | null =>
    sequence.find((s) => s.command === command) ?? null;

  const getStepByAgent = (agent: string): WorkflowStep | null =>
    sequence.find((s) => s.agent === agent) ?? null;

  const logPath = (workspaceDir: string): string =>
    join(workspaceDir, ".prides", logFilename);

  async function loadLogs(
    workspaceDir: string
  ): Promise<WorkflowStepResult[]> {
    const path = logPath(workspaceDir);
    if (!existsSync(path)) return [];
    const content = await readFile(path, "utf-8");
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? (parsed as WorkflowStepResult[]) : [];
    } catch {
      return [];
    }
  }

  async function saveLogs(
    workspaceDir: string,
    logs: WorkflowStepResult[]
  ): Promise<void> {
    const path = logPath(workspaceDir);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(logs, null, 2), "utf-8");
  }

  async function runStep(
    workspaceDir: string,
    stepIndex: number,
    input: string
  ): Promise<WorkflowStepResult> {
    if (stepIndex < 0 || stepIndex >= sequence.length) {
      return {
        agent: "",
        step: stepIndex,
        output: "",
        success: false,
        error: `Invalid step index: ${stepIndex}. Valid range: 0-${sequence.length - 1}`,
        timestamp: new Date().toISOString(),
      };
    }

    const step = sequence[stepIndex];
    const output = `[${step.agent}] Processing: ${input}`;

    const result: WorkflowStepResult = {
      agent: step.agent,
      step: stepIndex,
      output,
      success: true,
      timestamp: new Date().toISOString(),
    };

    const logs = await loadLogs(workspaceDir);
    logs.push(result);
    await saveLogs(workspaceDir, logs);

    return result;
  }

  return { getSequence, getStepByCommand, getStepByAgent, runStep, loadLogs };
}