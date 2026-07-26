import { getPhaseForAgent } from "./constants";
import { getRunnerForCommand, getRunnerForAgent } from "./workflows/registry";

export interface DispatchResult {
  agent: string;
  phase: string;
  command: string;
  description: string;
  success: boolean;
  error?: string;
}

export function getAgentForCommand(command: string): string | null {
  const found = getRunnerForCommand(command);
  return found ? found.step.agent : null;
}

export function getCommandForAgent(agent: string): string | null {
  const found = getRunnerForAgent(agent);
  return found ? found.step.command : null;
}

export async function dispatchAgent(
  workspaceDir: string,
  command: string
): Promise<DispatchResult> {
  const found = getRunnerForCommand(command);
  if (!found) {
    return {
      agent: "",
      phase: "",
      command,
      description: "",
      success: false,
      error: `Unknown command: ${command}`,
    };
  }

  const phase = getPhaseForAgent(found.step.agent);
  if (!phase) {
    return {
      agent: found.step.agent,
      phase: "",
      command: found.step.command,
      description: found.step.description,
      success: false,
      error: `Agent ${found.step.agent} has no assigned phase`,
    };
  }

  return {
    agent: found.step.agent,
    phase,
    command: found.step.command,
    description: found.step.description,
    success: true,
  };
}