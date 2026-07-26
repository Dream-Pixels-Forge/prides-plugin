import { describe, expect, test, beforeEach } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  WorkflowState,
  createWorkflow,
  loadWorkflow,
  advancePhase,
  getCurrentPhase,
  getPhaseStatus,
} from "../src/workflow";

const TEST_DIR = join(import.meta.dir, "..", ".test-workflow");

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe("workflow state machine", () => {
  test("createWorkflow creates initial state", async () => {
    const state = await createWorkflow(TEST_DIR, "my-project");
    expect(state).toHaveProperty("projectId", "my-project");
    expect(state).toHaveProperty("currentPhase", "prototype");
    expect(state).toHaveProperty("phases");
    expect(state).toHaveProperty("createdAt");
    expect(state.phases.prototype).toBe("active");
  });

  test("createWorkflow persists state to disk", async () => {
    await createWorkflow(TEST_DIR, "my-project");
    const state = await loadWorkflow(TEST_DIR, "my-project");
    expect(state).not.toBeNull();
    expect(state!.projectId).toBe("my-project");
    expect(state!.currentPhase).toBe("prototype");
  });

  test("loadWorkflow returns null for missing project", async () => {
    const state = await loadWorkflow(TEST_DIR, "nonexistent");
    expect(state).toBeNull();
  });

  test("advancePhase moves to next phase", async () => {
    await createWorkflow(TEST_DIR, "my-project");
    const next = await advancePhase(TEST_DIR, "my-project");
    expect(next).toBe("review");
    const state = await loadWorkflow(TEST_DIR, "my-project");
    expect(state!.currentPhase).toBe("review");
    expect(state!.phases.prototype).toBe("completed");
    expect(state!.phases.review).toBe("active");
  });

  test("advancePhase through all phases", async () => {
    await createWorkflow(TEST_DIR, "my-project");
    const phases = ["review", "implement", "deploy", "extend", "secure"];
    for (const expected of phases) {
      const next = await advancePhase(TEST_DIR, "my-project");
      expect(next).toBe(expected);
    }
    // After secure, advancePhase returns null (workflow complete)
    const done = await advancePhase(TEST_DIR, "my-project");
    expect(done).toBeNull();
  });

  test("advancePhase on completed workflow returns null", async () => {
    await createWorkflow(TEST_DIR, "my-project");
    for (let i = 0; i < 6; i++) {
      await advancePhase(TEST_DIR, "my-project");
    }
    const next = await advancePhase(TEST_DIR, "my-project");
    expect(next).toBeNull();
  });

  test("getCurrentPhase returns current phase", async () => {
    const state = await createWorkflow(TEST_DIR, "my-project");
    expect(getCurrentPhase(state)).toBe("prototype");
  });

  test("getPhaseStatus returns status of a phase", async () => {
    const state = await createWorkflow(TEST_DIR, "my-project");
    expect(getPhaseStatus(state, "prototype")).toBe("active");
    expect(getPhaseStatus(state, "review")).toBe("pending");
  });
});
