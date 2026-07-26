import { describe, expect, test, beforeEach } from "bun:test";
import { mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getDeploySequence,
  runDeployStep,
  getDeployStepByCommand,
} from "../src/workflows/deploy";

const TEST_DIR = join(import.meta.dir, "..", ".test-deploy");

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe("deploy workflow sequence", () => {
  test("getDeploySequence returns 2 agents in order", () => {
    const seq = getDeploySequence();
    expect(seq).toHaveLength(2);
    expect(seq.map((s) => s.agent)).toEqual([
      "deploy-agent",
      "deploy-performance",
    ]);
  });

  test("each step has agent, command, and description", () => {
    for (const step of getDeploySequence()) {
      expect(step).toHaveProperty("agent");
      expect(step).toHaveProperty("command");
      expect(step).toHaveProperty("description");
    }
  });

  test("runDeployStep returns result with agent and output", async () => {
    const result = await runDeployStep(TEST_DIR, 0, "deploy service");
    expect(result.agent).toBe("deploy-agent");
    expect(result.step).toBe(0);
    expect(result.success).toBe(true);
  });

  test("runDeployStep returns error for invalid step", async () => {
    const result = await runDeployStep(TEST_DIR, 99, "test");
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });

  test("runDeployStep persists step output to disk", async () => {
    await runDeployStep(TEST_DIR, 0, "deploy service");
    const logPath = join(TEST_DIR, ".prides", "deploy-steps.json");
    const content = await readFile(logPath, "utf-8");
    const logs = JSON.parse(content);
    expect(logs).toHaveLength(1);
    expect(logs[0].agent).toBe("deploy-agent");
  });

  test("getDeployStepByCommand returns correct step for deploy", () => {
    const step = getDeployStepByCommand("deploy");
    expect(step).not.toBeNull();
    expect(step!.agent).toBe("deploy-agent");
  });

  test("getDeployStepByCommand returns null for unknown command", () => {
    expect(getDeployStepByCommand("init")).toBeNull();
  });
});