import { describe, expect, test, beforeEach } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  detectProjectState,
  ProjectState,
} from "../src/orchestrator";

const TEST_DIR = join(import.meta.dir, "..", ".test-orchestrator");

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe("orchestrator — project state detection", () => {
  test("detectProjectState returns 'new' for empty directory", async () => {
    const state = await detectProjectState(TEST_DIR);
    expect(state).toBe("new");
  });

  test("detectProjectState returns 'existing' if .prides exists", async () => {
    await mkdir(join(TEST_DIR, ".prides", "proj"), { recursive: true });
    const state = await detectProjectState(TEST_DIR);
    expect(state).toBe("existing");
  });

  test("detectProjectState returns 'new' if .prides is empty", async () => {
    await mkdir(join(TEST_DIR, ".prides"), { recursive: true });
    const state = await detectProjectState(TEST_DIR);
    expect(state).toBe("new");
  });

  test("detectProjectState returns 'existing' if .prides has projects", async () => {
    const projectDir = join(TEST_DIR, ".prides", "my-project");
    await mkdir(projectDir, { recursive: true });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      join(projectDir, "state.json"),
      JSON.stringify({ projectId: "my-project", currentPhase: "review" }),
      "utf-8"
    );
    const state = await detectProjectState(TEST_DIR);
    expect(state).toBe("existing");
  });
});
