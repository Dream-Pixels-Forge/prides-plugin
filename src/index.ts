import type { PridesPluginInput, PridesTool, PluginResult } from "./types";
import { detectProjectState } from "./orchestrator";
import { createWorkflow, loadWorkflow, advancePhase } from "./workflow";
import { dispatchAgent } from "./dispatch";
import { AGENTS, getAgentsByPhase, PHASE_ORDER } from "./constants";
import { validateProjectId, validateCommand } from "./validation";
import { getPhaseRunner, runPhase } from "./workflows/registry";

export default async function pridesPlugin(
  input: PridesPluginInput
): Promise<PluginResult> {
  const dir = input.directory || process.cwd();

  const tools: PridesTool[] = [
    {
      name: "prides_init",
      description: "Initialize a new PRIDES project in the current workspace",
      parameters: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: "Project name (letters, numbers, hyphens, underscores only)",
          },
        },
        required: ["project"],
      },
      execute: async (args: Record<string, unknown>) => {
        const v = validateProjectId(args.project);
        if (!v.valid) return { text: `Invalid project ID: ${v.error}` };

        const project = args.project as string;
        const projectState = await detectProjectState(dir);
        if (projectState === "existing") {
          const workflow = await loadWorkflow(dir, project);
          if (workflow) {
            return {
              text: `Project "${project}" already exists. Current phase: ${workflow.currentPhase}`,
            };
          }
        }
        const state = await createWorkflow(dir, project);
        return {
          text: `PRIDES project "${project}" initialized. Starting phase: ${state.currentPhase} (${state.phases[state.currentPhase]})`,
        };
      },
    },
    {
      name: "prides_dispatch",
      description:
        "Dispatch a single task to the appropriate PRIDES agent by command name",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description:
              "Command to dispatch (init, new-feature, bug-fix, review, deploy, secure, etc.)",
          },
        },
        required: ["command"],
      },
      execute: async (args: Record<string, unknown>) => {
        const v = validateCommand(args.command);
        if (!v.valid) return { text: `Invalid command: ${v.error}` };

        const result = await dispatchAgent(dir, args.command as string);
        if (!result.success) {
          return { text: `Dispatch failed: ${result.error}` };
        }
        return {
          text: `Dispatched to agent "${result.agent}" in phase "${result.phase}" (${result.description})`,
        };
      },
    },
    {
      name: "prides_run_phase",
      description:
        "Run the full agent sequence for the current (or specified) phase",
      parameters: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: "Project name",
          },
          phase: {
            type: "string",
            description:
              "Phase to run (defaults to project's current phase): " +
              PHASE_ORDER.join(", "),
          },
          input: {
            type: "string",
            description: "Input brief passed to each agent step",
          },
        },
        required: ["project"],
      },
      execute: async (args: Record<string, unknown>) => {
        const v = validateProjectId(args.project);
        if (!v.valid) return { text: `Invalid project ID: ${v.error}` };

        const project = args.project as string;
        const workflow = await loadWorkflow(dir, project);
        if (!workflow) {
          return { text: `No PRIDES project found. Run prides_init first.` };
        }

        const phase = (args.phase as string) || workflow.currentPhase;
        const runner = getPhaseRunner(phase);
        if (!runner) {
          return { text: `Unknown phase: ${phase}` };
        }

        const brief = (args.input as string) || `Phase ${phase} execution`;
        const { results } = await runPhase(dir, phase, brief);

        const lines = results.map(
          (r, i) =>
            `Step ${i + 1}/${runner.sequence.length} (${runner.sequence[i]?.agent ?? "?"}): ${
              r.success ? "OK" : "FAILED" + (r.error ? " — " + r.error : "")
            }`
        );
        return {
          text: `Ran phase "${phase}" for project "${project}":\n${lines.join("\n")}`,
        };
      },
    },
    {
      name: "prides_status",
      description: "Show current PRIDES workflow status",
      parameters: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: "Project name",
          },
        },
        required: ["project"],
      },
      execute: async (args: Record<string, unknown>) => {
        const v = validateProjectId(args.project);
        if (!v.valid) return { text: `Invalid project ID: ${v.error}` };

        const project = args.project as string;
        const workflow = await loadWorkflow(dir, project);
        if (!workflow) {
          return {
            text: `No PRIDES project found. Run prides_init to create one.`,
          };
        }
        const agents = getAgentsByPhase(workflow.currentPhase);
        const runner = getPhaseRunner(workflow.currentPhase);
        const phaseSteps = runner ? runner.sequence.length : 0;
        return {
          text: `Project: ${workflow.projectId}\nCurrent phase: ${workflow.currentPhase} (${workflow.phases[workflow.currentPhase]})\nAgents in phase (${agents.length}): ${agents.map((a) => a.name).join(", ")}\nSequence steps: ${phaseSteps}\nPhase statuses: ${Object.entries(workflow.phases).map(([k, val]) => `${k}: ${val}`).join(", ")}`,
        };
      },
    },
    {
      name: "prides_advance",
      description: "Advance the workflow to the next phase",
      parameters: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: "Project name",
          },
        },
        required: ["project"],
      },
      execute: async (args: Record<string, unknown>) => {
        const v = validateProjectId(args.project);
        if (!v.valid) return { text: `Invalid project ID: ${v.error}` };

        const project = args.project as string;
        const workflow = await loadWorkflow(dir, project);
        if (!workflow) {
          return {
            text: `No PRIDES project found. Run prides_init first.`,
          };
        }
        const nextPhase = await advancePhase(dir, project);
        if (!nextPhase) {
          return { text: `All phases complete! Project "${project}" is done.` };
        }
        return {
          text: `Advanced to phase: ${nextPhase}`,
        };
      },
    },
    {
      name: "prides_agents",
      description: "List all PRIDES agents and their phases",
      parameters: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        const lines = Object.entries(AGENTS).map(
          ([id, agent]) =>
            `${agent.phase}/${id}: ${agent.name} - ${agent.description} (temp: ${agent.temperature})`
        );
        return { text: `PRIDES Agents (${Object.keys(AGENTS).length} total):\n\n${lines.join("\n")}` };
      },
    },
  ];

  return {
    name: "prides",
    tools,
  };
}