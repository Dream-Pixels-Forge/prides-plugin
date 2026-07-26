import { describe, expect, test, beforeEach } from "bun:test";
import { mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getPhaseRunner,
  getRunnerForCommand,
  getRunnerForAgent,
  runPhase,
} from "../src/workflows/registry";

const TEST_DIR = join(import.meta.dir, "..", ".test-registry");

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe("workflow registry", () => {
  test("getPhaseRunner returns runner for all 6 phases", () => {
    for (const phase of [
      "prototype",
      "review",
      "implement",
      "deploy",
      "extend",
      "secure",
    ]) {
      const runner = getPhaseRunner(phase);
      expect(runner).not.toBeNull();
      expect(runner!.phase).toBe(phase);
      expect(runner!.sequence.length).toBeGreaterThan(0);
    }
  });

  test("getPhaseRunner returns null for unknown phase", () => {
    expect(getPhaseRunner("nonexistent")).toBeNull();
  });

  test("each runner exposes the required methods", () => {
    const runner = getPhaseRunner("prototype")!;
    expect(typeof runner.getSequence).toBe("function");
    expect(typeof runner.getStepByCommand).toBe("function");
    expect(typeof runner.getStepByAgent).toBe("function");
    expect(typeof runner.runStep).toBe("function");
    expect(typeof runner.loadLogs).toBe("function");
  });

  test("getRunnerForCommand returns correct phase for each command", () => {
    const cases: Array<[string, string, string]> = [
      ["init", "prototype", "prototype-idea"],
      ["create-prd", "prototype", "prototype-prd"],
      ["review", "review", "review-critic"],
      ["audit", "review", "review-silent-failure-hunter"],
      ["refactor", "implement", "implement-coder"],
      ["lint", "implement", "implement-linter"],
      ["deploy", "deploy", "deploy-agent"],
      ["performance", "deploy", "deploy-performance"],
      ["architect", "extend", "extend-architect"],
      ["secure", "secure", "secure-agent"],
      ["security-audit", "secure", "secure-architect"],
    ];
    for (const [cmd, phase, agent] of cases) {
      const r = getRunnerForCommand(cmd);
      expect(r).not.toBeNull();
      expect(r!.phase).toBe(phase);
      expect(r!.step.agent).toBe(agent);
    }
  });

  test("getRunnerForCommand returns null for unknown command", () => {
    expect(getRunnerForCommand("frobnicate")).toBeNull();
  });

  test("getRunnerForAgent returns correct phase", () => {
    const r = getRunnerForAgent("prototype-idea");
    expect(r).not.toBeNull();
    expect(r!.phase).toBe("prototype");
    expect(r!.step.agent).toBe("prototype-idea");
  });

  test("getRunnerForAgent returns null for unknown agent", () => {
    expect(getRunnerForAgent("nobody")).toBeNull();
  });

  test("runPhase runs all steps in a phase sequence", async () => {
    const { phase, results } = await runPhase(
      TEST_DIR,
      "extend",
      "scale the system"
    );
    expect(phase).toBe("extend");
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].agent).toBe("extend-architect");
  });

  test("runPhase runs all 5 prototype steps in order", async () => {
    const { results } = await runPhase(TEST_DIR, "prototype", "build app");
    expect(results).toHaveLength(5);
    expect(results.map((r) => r.agent)).toEqual([
      "prototype-idea",
      "prototype-analyst",
      "prototype-prd",
      "prototype-plan",
      "prototype-agent",
    ]);
    for (const r of results) expect(r.success).toBe(true);
  });

  test("runPhase returns error result for unknown phase", async () => {
    const { phase, results } = await runPhase(TEST_DIR, "frobnicate", "x");
    expect(phase).toBe("frobnicate");
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toMatch(/unknown phase/i);
  });

  test("runPhase logs persist to phase-specific file", async () => {
    await runPhase(TEST_DIR, "deploy", "ship it");
    const logPath = join(TEST_DIR, ".prides", "deploy-steps.json");
    const content = await readFile(logPath, "utf-8");
    const logs = JSON.parse(content);
    expect(logs).toHaveLength(2);
  });
});