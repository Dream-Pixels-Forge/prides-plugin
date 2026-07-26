import { describe, expect, test, beforeEach } from "bun:test";
import { mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getImplementSequence,
  runImplementStep,
  getImplementStepByCommand,
  ImplementStepResult,
} from "../src/workflows/implement";

const TEST_DIR = join(import.meta.dir, "..", ".test-implement");

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe("implement workflow sequence", () => {
  test("getImplementSequence returns 6 agents in order", () => {
    const seq = getImplementSequence();
    expect(seq).toHaveLength(6);
    expect(seq.map((s) => s.agent)).toEqual([
      "implement-features",
      "implement-uiux",
      "implement-coder",
      "implement-debugger",
      "implement-linter",
      "implement-tasks",
    ]);
  });

  test("each step has agent, command, and description", () => {
    const seq = getImplementSequence();
    for (const step of seq) {
      expect(step).toHaveProperty("agent");
      expect(step).toHaveProperty("command");
      expect(step).toHaveProperty("description");
    }
  });

  test("runImplementStep returns result with agent and output", async () => {
    const result = await runImplementStep(TEST_DIR, 0, "implement feature x");
    expect(result).toHaveProperty("agent", "implement-features");
    expect(result).toHaveProperty("step", 0);
    expect(result).toHaveProperty("output");
    expect(result).toHaveProperty("success", true);
  });

  test("runImplementStep returns error for invalid step", async () => {
    const result = await runImplementStep(TEST_DIR, 99, "test");
    expect(result).toHaveProperty("success", false);
    expect(result).toHaveProperty("error");
  });

  test("runImplementStep persists step output to disk", async () => {
    await runImplementStep(TEST_DIR, 0, "implement feature x");
    const logPath = join(TEST_DIR, ".prides", "implement-steps.json");
    const content = await readFile(logPath, "utf-8");
    const logs = JSON.parse(content);
    expect(logs).toHaveLength(1);
    expect(logs[0].agent).toBe("implement-features");
  });

  test("getImplementStepByCommand returns correct step for refactor", () => {
    const step = getImplementStepByCommand("refactor");
    expect(step).not.toBeNull();
    expect(step!.agent).toBe("implement-coder");
  });

  test("getImplementStepByCommand returns null for unknown command", () => {
    const step = getImplementStepByCommand("deploy");
    expect(step).toBeNull();
  });
});
