import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { PHASE_ORDER } from "./constants";

export interface WorkflowState {
  projectId: string;
  currentPhase: string;
  phases: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

function getStatePath(workspaceDir: string, projectId: string): string {
  return join(workspaceDir, ".prides", projectId, "state.json");
}

export async function createWorkflow(
  workspaceDir: string,
  projectId: string
): Promise<WorkflowState> {
  const state: WorkflowState = {
    projectId,
    currentPhase: PHASE_ORDER[0],
    phases: Object.fromEntries(
      PHASE_ORDER.map((p, i) => [p, i === 0 ? "active" : "pending"])
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveWorkflow(workspaceDir, state);
  return state;
}

export async function saveWorkflow(
  workspaceDir: string,
  state: WorkflowState
): Promise<void> {
  const path = getStatePath(workspaceDir, state.projectId);
  const dir = join(path, "..");
  await mkdir(dir, { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2), "utf-8");
}

export async function loadWorkflow(
  workspaceDir: string,
  projectId: string
): Promise<WorkflowState | null> {
  const path = getStatePath(workspaceDir, projectId);
  if (!existsSync(path)) return null;
  const content = await readFile(path, "utf-8");
  return JSON.parse(content) as WorkflowState;
}

export function getCurrentPhase(state: WorkflowState): string {
  return state.currentPhase;
}

export function getPhaseStatus(
  state: WorkflowState,
  phase?: string
): string {
  const target = phase || state.currentPhase;
  return state.phases[target] || "unknown";
}

export async function advancePhase(
  workspaceDir: string,
  projectId: string
): Promise<string | null> {
  const state = await loadWorkflow(workspaceDir, projectId);
  if (!state) throw new Error(`Workflow not found: ${projectId}`);

  const currentIdx = PHASE_ORDER.indexOf(state.currentPhase);
  if (currentIdx === -1) throw new Error(`Invalid phase: ${state.currentPhase}`);

  // Mark current as completed
  state.phases[state.currentPhase] = "completed";

  // Move to next phase
  const nextIdx = currentIdx + 1;
  if (nextIdx >= PHASE_ORDER.length) {
    state.updatedAt = new Date().toISOString();
    await saveWorkflow(workspaceDir, state);
    return null; // All phases complete
  }

  const nextPhase = PHASE_ORDER[nextIdx];
  state.currentPhase = nextPhase;
  state.phases[nextPhase] = "active";
  state.updatedAt = new Date().toISOString();
  await saveWorkflow(workspaceDir, state);
  return nextPhase;
}
