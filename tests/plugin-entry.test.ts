import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const pluginPath = join(import.meta.dir, "..", "src", "index.ts");

describe("prides plugin entry", () => {
  test("exports a default function", async () => {
    const mod = await import(pluginPath);
    expect(typeof mod.default).toBe("function");
  });

  test("returns { name: 'prides', tools: [...] }", async () => {
    const mod = await import(pluginPath);
    const result = await mod.default({ directory: "/tmp/test" });
    expect(result).toHaveProperty("name", "prides");
    expect(result).toHaveProperty("tools");
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools.length).toBeGreaterThan(0);
  });

  test("returns tools with required shape", async () => {
    const mod = await import(pluginPath);
    const result = await mod.default({ directory: "/tmp/test" });
    for (const t of result.tools) {
      expect(t).toHaveProperty("name");
      expect(t).toHaveProperty("description");
      expect(t).toHaveProperty("parameters");
      expect(t).toHaveProperty("execute");
      expect(typeof t.name).toBe("string");
      expect(typeof t.description).toBe("string");
      expect(typeof t.parameters).toBe("object");
      expect(typeof t.execute).toBe("function");
    }
  });
});
