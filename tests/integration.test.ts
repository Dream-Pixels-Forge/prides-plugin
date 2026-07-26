import { describe, expect, test, beforeEach } from "bun:test";
import pridesPlugin from "../src/index";

describe("plugin integration", () => {
  let plugin: Awaited<ReturnType<typeof pridesPlugin>>;

  beforeEach(async () => {
    plugin = await pridesPlugin({ directory: "/tmp/test" });
  });

  test("plugin has name 'prides'", () => {
    expect(plugin.name).toBe("prides");
  });

  test("plugin exports 11 tools", () => {
    expect(plugin.tools.length).toBe(11);
  });

  test("tool names are correct", () => {
    const names = plugin.tools.map((t) => t.name);
    expect(names).toEqual([
      "prides_init",
      "prides_dispatch",
      "prides_run_phase",
      "prides_status",
      "prides_advance",
      "prides_agents",
      "prides_log",
      "prides_budget",
      "prides_memory",
      "prides_conflicts",
      "prides_plan",
    ]);
  });

  test("each tool has name, description, parameters, execute", () => {
    for (const tool of plugin.tools) {
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("description");
      expect(tool).toHaveProperty("parameters");
      expect(tool).toHaveProperty("execute");
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
      expect(typeof tool.parameters).toBe("object");
      expect(typeof tool.execute).toBe("function");
    }
  });

  test("prides_init tool has name property", () => {
    const init = plugin.tools.find((t) => t.name === "prides_init");
    expect(init).toBeDefined();
    expect(init!.name).toBe("prides_init");
  });

  test("prides_dispatch tool accepts command parameter", () => {
    const dispatch = plugin.tools.find((t) => t.name === "prides_dispatch");
    expect(dispatch).toBeDefined();
    const params = dispatch!.parameters as Record<string, unknown>;
    expect(params).toHaveProperty("properties");
    const properties = params.properties as Record<string, unknown>;
    expect(properties).toHaveProperty("command");
  });

  test("prides_status tool returns workflow info", async () => {
    const status = plugin.tools.find((t) => t.name === "prides_status");
    expect(status).toBeDefined();
    // Execute with no project - should return helpful message
    const result = await status!.execute({ project: "nonexistent" });
    expect(result).toHaveProperty("text");
  });

  test("prides_run_phase tool exists and accepts project + optional phase", () => {
    const runPhase = plugin.tools.find((t) => t.name === "prides_run_phase");
    expect(runPhase).toBeDefined();
    const params = runPhase!.parameters as Record<string, unknown>;
    const props = params.properties as Record<string, unknown>;
    expect(props).toHaveProperty("project");
    expect(props).toHaveProperty("phase");
    expect(props).toHaveProperty("input");
  });

  test("prides_init rejects invalid project ID", async () => {
    const init = plugin.tools.find((t) => t.name === "prides_init")!;
    const result = await init.execute({ project: "../../etc/passwd" });
    expect(result.text).toMatch(/invalid/i);
  });

  test("prides_dispatch rejects invalid command", async () => {
    const dispatch = plugin.tools.find((t) => t.name === "prides_dispatch")!;
    const result = await dispatch.execute({ command: "../../etc" });
    expect(result.text).toMatch(/invalid|unknown/i);
  });

  test("prides_run_phase requires an existing project", async () => {
    const runPhase = plugin.tools.find((t) => t.name === "prides_run_phase")!;
    const result = await runPhase.execute({ project: "nonexistent-proj" });
    expect(result.text).toMatch(/no PRIDES project/i);
  });

  test("prides_status rejects malformed project ID", async () => {
    const status = plugin.tools.find((t) => t.name === "prides_status")!;
    const result = await status.execute({ project: "a/b/c" });
    expect(result.text).toMatch(/invalid/i);
  });
});
