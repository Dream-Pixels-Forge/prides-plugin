import { describe, expect, test, beforeEach } from "bun:test";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getPrototypeSequence,
  runPrototypeStep,
  PrototypeStepResult,
} from "../src/workflows/prototype";

const TEST_DIR = join(import.meta.dir, "..", ".test-prototype");

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe("prototype workflow sequence", () => {
  test("getPrototypeSequence returns 5 agents in order", () => {
    const seq = getPrototypeSequence();
    expect(seq).toHaveLength(5);
    expect(seq.map((s) => s.agent)).toEqual([
      "prototype-idea",
      "prototype-analyst",
      "prototype-prd",
      "prototype-plan",
      "prototype-agent",
    ]);
  });

  test("each step has agent, command, and description", () => {
    const seq = getPrototypeSequence();
    for (const step of seq) {
      expect(step).toHaveProperty("agent");
      expect(step).toHaveProperty("command");
      expect(step).toHaveProperty("description");
      expect(typeof step.agent).toBe("string");
      expect(typeof step.command).toBe("string");
      expect(typeof step.description).toBe("string");
    }
  });

  test("runPrototypeStep returns result with agent and output", async () => {
    const result = await runPrototypeStep(TEST_DIR, 0, "build a todo app");
    expect(result).toHaveProperty("agent", "prototype-idea");
    expect(result).toHaveProperty("step", 0);
    expect(result).toHaveProperty("output");
    expect(result).toHaveProperty("success", true);
  });

  test("runPrototypeStep returns error for invalid step", async () => {
    const result = await runPrototypeStep(TEST_DIR, 99, "test");
    expect(result).toHaveProperty("success", false);
    expect(result).toHaveProperty("error");
  });

  test("runPrototypeStep persists step output to disk", async () => {
    await runPrototypeStep(TEST_DIR, 0, "build a todo app");
    const logPath = join(TEST_DIR, ".prides", "prototype-steps.json");
    const content = await readFile(logPath, "utf-8");
    const logs = JSON.parse(content);
    expect(logs).toHaveLength(1);
    expect(logs[0].agent).toBe("prototype-idea");
    expect(logs[0].step).toBe(0);
  });

  test("runPrototypeStep appends to existing logs", async () => {
    await runPrototypeStep(TEST_DIR, 0, "idea 1");
    await runPrototypeStep(TEST_DIR, 0, "idea 2");
    const logPath = join(TEST_DIR, ".prides", "prototype-steps.json");
    const content = await readFile(logPath, "utf-8");
    const logs = JSON.parse(content);
    expect(logs).toHaveLength(2);
  });

  test("getPrototypeStepByCommand returns correct step for init", () => {
    const { getPrototypeStepByCommand } = require("../src/workflows/prototype");
    const step = getPrototypeStepByCommand("init");
    expect(step).not.toBeNull();
    expect(step!.agent).toBe("prototype-idea");
    expect(step!.command).toBe("init");
  });

  test("getPrototypeStepByCommand returns null for unknown command", () => {
    const { getPrototypeStepByCommand } = require("../src/workflows/prototype");
    const step = getPrototypeStepByCommand("deploy");
    expect(step).toBeNull();
  });
});
