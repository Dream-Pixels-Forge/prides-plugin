import { describe, expect, test, beforeEach } from "bun:test";
import { mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getReviewSequence,
  runReviewStep,
  getReviewStepByCommand,
  ReviewStepResult,
} from "../src/workflows/review";

const TEST_DIR = join(import.meta.dir, "..", ".test-review");

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe("review workflow sequence", () => {
  test("getReviewSequence returns 4 agents in order", () => {
    const seq = getReviewSequence();
    expect(seq).toHaveLength(4);
    expect(seq.map((s) => s.agent)).toEqual([
      "review-critic",
      "review-inspector",
      "review-git-expert",
      "review-silent-failure-hunter",
    ]);
  });

  test("each step has agent, command, and description", () => {
    const seq = getReviewSequence();
    for (const step of seq) {
      expect(step).toHaveProperty("agent");
      expect(step).toHaveProperty("command");
      expect(step).toHaveProperty("description");
    }
  });

  test("runReviewStep returns result with agent and output", async () => {
    const result = await runReviewStep(TEST_DIR, 0, "review this code");
    expect(result).toHaveProperty("agent", "review-critic");
    expect(result).toHaveProperty("step", 0);
    expect(result).toHaveProperty("output");
    expect(result).toHaveProperty("success", true);
  });

  test("runReviewStep returns error for invalid step", async () => {
    const result = await runReviewStep(TEST_DIR, 99, "test");
    expect(result).toHaveProperty("success", false);
    expect(result).toHaveProperty("error");
  });

  test("runReviewStep persists step output to disk", async () => {
    await runReviewStep(TEST_DIR, 0, "review this code");
    const logPath = join(TEST_DIR, ".prides", "review-steps.json");
    const content = await readFile(logPath, "utf-8");
    const logs = JSON.parse(content);
    expect(logs).toHaveLength(1);
    expect(logs[0].agent).toBe("review-critic");
  });

  test("getReviewStepByCommand returns correct step for review", () => {
    const step = getReviewStepByCommand("review");
    expect(step).not.toBeNull();
    expect(step!.agent).toBe("review-critic");
  });

  test("getReviewStepByCommand returns null for unknown command", () => {
    const step = getReviewStepByCommand("deploy");
    expect(step).toBeNull();
  });
});
