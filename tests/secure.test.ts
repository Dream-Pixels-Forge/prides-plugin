import { describe, expect, test, beforeEach } from "bun:test";
import { mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getSecureSequence,
  runSecureStep,
  getSecureStepByCommand,
} from "../src/workflows/secure";

const TEST_DIR = join(import.meta.dir, "..", ".test-secure");

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe("secure workflow sequence", () => {
  test("getSecureSequence returns 2 agents in order", () => {
    const seq = getSecureSequence();
    expect(seq).toHaveLength(2);
    expect(seq.map((s) => s.agent)).toEqual([
      "secure-agent",
      "secure-architect",
    ]);
  });

  test("each step has agent, command, and description", () => {
    for (const step of getSecureSequence()) {
      expect(step).toHaveProperty("agent");
      expect(step).toHaveProperty("command");
      expect(step).toHaveProperty("description");
    }
  });

  test("runSecureStep returns result with agent and output", async () => {
    const result = await runSecureStep(TEST_DIR, 0, "audit security");
    expect(result.agent).toBe("secure-agent");
    expect(result.step).toBe(0);
    expect(result.success).toBe(true);
  });

  test("runSecureStep returns error for invalid step", async () => {
    const result = await runSecureStep(TEST_DIR, 99, "test");
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });

  test("runSecureStep persists step output to disk", async () => {
    await runSecureStep(TEST_DIR, 0, "audit security");
    const logPath = join(TEST_DIR, ".prides", "secure-steps.json");
    const content = await readFile(logPath, "utf-8");
    const logs = JSON.parse(content);
    expect(logs).toHaveLength(1);
    expect(logs[0].agent).toBe("secure-agent");
  });

  test("getSecureStepByCommand returns correct step for security-audit", () => {
    const step = getSecureStepByCommand("security-audit");
    expect(step).not.toBeNull();
    expect(step!.agent).toBe("secure-architect");
  });

  test("getSecureStepByCommand returns null for unknown command", () => {
    expect(getSecureStepByCommand("init")).toBeNull();
  });
});