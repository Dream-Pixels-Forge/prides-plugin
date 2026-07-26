import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  PHASES,
  PHASE_ORDER,
  AGENTS,
  getAgentsByPhase,
  getPhaseForAgent,
} from "../src/constants";

describe("phases", () => {
  test("PHASES contains all 6 phases", () => {
    expect(Object.keys(PHASES)).toEqual([
      "prototype",
      "review",
      "implement",
      "deploy",
      "extend",
      "secure",
    ]);
  });

  test("PHASE_ORDER matches PHASES keys", () => {
    expect(PHASE_ORDER).toEqual(Object.keys(PHASES));
  });

  test("each phase has required metadata", () => {
    for (const [key, phase] of Object.entries(PHASES)) {
      expect(phase).toHaveProperty("name");
      expect(phase).toHaveProperty("description");
      expect(phase).toHaveProperty("order");
      expect(typeof phase.name).toBe("string");
      expect(typeof phase.description).toBe("string");
      expect(typeof phase.order).toBe("number");
      expect(phase.order).toBe(PHASE_ORDER.indexOf(key));
    }
  });
});

describe("agents", () => {
  test("contains all 20 agents", () => {
    expect(Object.keys(AGENTS).length).toBe(20);
  });

  test("each agent has required metadata", () => {
    for (const [key, agent] of Object.entries(AGENTS)) {
      expect(agent).toHaveProperty("name");
      expect(agent).toHaveProperty("phase");
      expect(agent).toHaveProperty("description");
      expect(agent).toHaveProperty("temperature");
      expect(typeof agent.name).toBe("string");
      expect(typeof agent.phase).toBe("string");
      expect(typeof agent.description).toBe("string");
      expect(typeof agent.temperature).toBe("number");
    }
  });

  test("getAgentsByPhase returns correct agents per phase", () => {
    expect(getAgentsByPhase("prototype")).toHaveLength(5);
    expect(getAgentsByPhase("review")).toHaveLength(4);
    expect(getAgentsByPhase("implement")).toHaveLength(6);
    expect(getAgentsByPhase("deploy")).toHaveLength(2);
    expect(getAgentsByPhase("extend")).toHaveLength(1);
    expect(getAgentsByPhase("secure")).toHaveLength(2);
  });

  test("getPhaseForAgent returns correct phase", () => {
    expect(getPhaseForAgent("prototype-idea")).toBe("prototype");
    expect(getPhaseForAgent("implement-coder")).toBe("implement");
    expect(getPhaseForAgent("deploy-agent")).toBe("deploy");
  });

  test("getPhaseForAgent returns null for unknown agent", () => {
    expect(getPhaseForAgent("unknown-agent")).toBeNull();
  });
});
