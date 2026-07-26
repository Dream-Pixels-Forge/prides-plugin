import { describe, expect, test } from "bun:test";
import { validateProjectId, validateCommand } from "../src/validation";

describe("validateProjectId", () => {
  test("accepts valid ID", () => {
    expect(validateProjectId("my-project")).toEqual({ valid: true });
  });

  test("accepts underscore and numbers", () => {
    expect(validateProjectId("proj_123")).toEqual({ valid: true });
  });

  test("rejects empty string", () => {
    const r = validateProjectId("");
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/required/i);
  });

  test("rejects non-string", () => {
    expect(validateProjectId(undefined).valid).toBe(false);
    expect(validateProjectId(42).valid).toBe(false);
    expect(validateProjectId(null).valid).toBe(false);
  });

  test("rejects path traversal", () => {
    const r = validateProjectId("../../etc");
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/path traversal|letters/i);
  });

  test("rejects slashes", () => {
    expect(validateProjectId("a/b").valid).toBe(false);
  });

  test("rejects overlong ID", () => {
    expect(validateProjectId("x".repeat(129)).valid).toBe(false);
  });
});

describe("validateCommand", () => {
  test("accepts valid command", () => {
    expect(validateCommand("init")).toEqual({ valid: true });
  });

  test("accepts hyphenated command", () => {
    expect(validateCommand("new-feature")).toEqual({ valid: true });
  });

  test("rejects empty", () => {
    expect(validateCommand("").valid).toBe(false);
  });

  test("rejects non-string", () => {
    expect(validateCommand(null).valid).toBe(false);
  });

  test("rejects path traversal", () => {
    expect(validateCommand("../x").valid).toBe(false);
  });
});