import { describe, expect, test, beforeEach } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import pridesPlugin from "../src/index";

const TEST_DIR = join(import.meta.dir, "..", ".test-e2e");

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe("plugin end-to-end", () => {
  test("full lifecycle: init → run_phase → status → advance", async () => {
    const plugin = await pridesPlugin({ directory: TEST_DIR });
    const init = plugin.tools.find((t) => t.name === "prides_init")!;
    const runPhase = plugin.tools.find((t) => t.name === "prides_run_phase")!;
    const status = plugin.tools.find((t) => t.name === "prides_status")!;
    const advance = plugin.tools.find((t) => t.name === "prides_advance")!;

    // Init
    const initResult = await init.execute({ project: "lifecycle-proj" });
    expect(initResult.text).toMatch(/initialized/i);
    expect(initResult.text).toMatch(/prototype/);

    // Status: should report prototype/active
    const statusResult = await status.execute({ project: "lifecycle-proj" });
    expect(statusResult.text).toMatch(/prototype/);
    expect(statusResult.text).toMatch(/active/i);

    // Run phase: prototype (5 steps)
    const runResult = await runPhase.execute({
      project: "lifecycle-proj",
      input: "build a todo app",
    });
    expect(runResult.text).toMatch(/prototype/);
    expect(runResult.text).toMatch(/5\/5/);

    // Advance
    const advanceResult = await advance.execute({ project: "lifecycle-proj" });
    expect(advanceResult.text).toMatch(/review/);

    // Status now reports review
    const statusAfter = await status.execute({ project: "lifecycle-proj" });
    expect(statusAfter.text).toMatch(/review/);
    expect(statusAfter.text).toMatch(/prototype: completed/);
    expect(statusAfter.text).toMatch(/review: active/);
  });

  test("advance through all phases and finish", async () => {
    const plugin = await pridesPlugin({ directory: TEST_DIR });
    const init = plugin.tools.find((t) => t.name === "prides_init")!;
    const advance = plugin.tools.find((t) => t.name === "prides_advance")!;

    await init.execute({ project: "finish-proj" });
    const phases = ["review", "implement", "deploy", "extend", "secure"];
    for (const expected of phases) {
      const result = await advance.execute({ project: "finish-proj" });
      expect(result.text).toMatch(new RegExp(expected, "i"));
    }
    const final = await advance.execute({ project: "finish-proj" });
    expect(final.text).toMatch(/complete|done/i);
  });

  test("init, then run a custom phase via prides_run_phase", async () => {
    const plugin = await pridesPlugin({ directory: TEST_DIR });
    const init = plugin.tools.find((t) => t.name === "prides_init")!;
    const runPhase = plugin.tools.find((t) => t.name === "prides_run_phase")!;

    await init.execute({ project: "custom-proj" });

    // Explicitly run the extend phase (1 step)
    const result = await runPhase.execute({
      project: "custom-proj",
      phase: "extend",
      input: "scale the api",
    });
    expect(result.text).toMatch(/extend/);
    expect(result.text).toMatch(/1\/1/);
  });

  test("prides_run_phase rejects unknown phase", async () => {
    const plugin = await pridesPlugin({ directory: TEST_DIR });
    const init = plugin.tools.find((t) => t.name === "prides_init")!;
    const runPhase = plugin.tools.find((t) => t.name === "prides_run_phase")!;

    await init.execute({ project: "bad-phase-proj" });
    const result = await runPhase.execute({
      project: "bad-phase-proj",
      phase: "frobnicate",
    });
    expect(result.text).toMatch(/unknown phase/i);
  });
});