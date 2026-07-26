import { describe, expect, test, beforeEach } from "bun:test";
import { mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getExtendSequence,
  runExtendStep,
  getExtendStepByCommand,
} from "../src/workflows/extend";

const TEST_DIR = join(import.meta.dir, "..", ".test-extend");

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe("extend workflow sequence", () => {
  test("getExtendSequence returns 1 agent", () => {
    const seq = getExtendSequence();
    expect(seq).toHaveLength(1);
    expect(seq.map((s) => s.agent)).toEqual(["extend-architect"]);
  });

  test("each step has agent, command, and description", () => {
    for (const step of getExtendSequence()) {
      expect(step).toHaveProperty("agent");
      expect(step).toHaveProperty("command");
      expect(step).toHaveProperty("description");
    }
  });

  test("runExtendStep returns result with agent and output", async () => {
    const result = await runExtendStep(TEST_DIR, 0, "plan scaling");
    expect(result.agent).toBe("extend-architect");
    expect(result.step).toBe(0);
    expect(result.success).toBe(true);
  });

  test("runExtendStep returns error for invalid step", async () => {
    const result = await runExtendStep(TEST_DIR, 99, "test");
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });

  test("runExtendStep persists step output to disk", async () => {
    await runExtendStep(TEST_DIR, 0, "plan scaling");
    const logPath = join(TEST_DIR, ".prides", "extend-steps.json");
    const content = await readFile(logPath, "utf-8");
    const logs = JSON.parse(content);
    expect(logs).toHaveLength(1);
    expect(logs[0].agent).toBe("extend-architect");
  });

  test("getExtendStepByCommand returns correct step for architect", () => {
    const step = getExtendStepByCommand("architect");
    expect(step).not.toBeNull();
    expect(step!.agent).toBe("extend-architect");
  });

  test("getExtendStepByCommand returns null for unknown command", () => {
    expect(getExtendStepByCommand("init")).toBeNull();
  });
});