import { describe, expect, test, beforeEach } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { dispatchAgent, getAgentForCommand, DispatchResult } from "../src/dispatch";

const TEST_DIR = join(import.meta.dir, "..", ".test-dispatch");

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe("dispatch — agent routing", () => {
  test("getAgentForCommand returns correct agent for init", () => {
    const agent = getAgentForCommand("init");
    expect(agent).toBe("prototype-idea");
  });

  test("getAgentForCommand returns correct agent for new-feature", () => {
    const agent = getAgentForCommand("new-feature");
    expect(agent).toBe("implement-features");
  });

  test("getAgentForCommand returns correct agent for bug-fix", () => {
    const agent = getAgentForCommand("bug-fix");
    expect(agent).toBe("implement-debugger");
  });

  test("getAgentForCommand returns correct agent for review", () => {
    const agent = getAgentForCommand("review");
    expect(agent).toBe("review-critic");
  });

  test("getAgentForCommand returns null for unknown command", () => {
    const agent = getAgentForCommand("unknown");
    expect(agent).toBeNull();
  });

  test("dispatchAgent returns DispatchResult with agent and phase", async () => {
    const result = await dispatchAgent(TEST_DIR, "init");
    expect(result).toHaveProperty("agent");
    expect(result).toHaveProperty("phase");
    expect(result).toHaveProperty("success");
    expect(result.agent).toBe("prototype-idea");
    expect(result.phase).toBe("prototype");
    expect(result.success).toBe(true);
  });

  test("dispatchAgent returns success false for unknown command", async () => {
    const result = await dispatchAgent(TEST_DIR, "unknown-command");
    expect(result.success).toBe(false);
  });
});
