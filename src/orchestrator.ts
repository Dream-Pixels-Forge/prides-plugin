import { readdir } from "node:fs/promises";
import { join } from "node:path";

export type ProjectState = "new" | "existing";

export async function detectProjectState(
  workspaceDir: string
): Promise<ProjectState> {
  const pridesDir = join(workspaceDir, ".prides");
  try {
    const entries = await readdir(pridesDir, { withFileTypes: true });
    const hasProjects = entries.some((e) => e.isDirectory());
    return hasProjects ? "existing" : "new";
  } catch {
    return "new";
  }
}
