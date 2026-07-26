export interface Phase {
  name: string;
  description: string;
  order: number;
}

export interface Agent {
  name: string;
  phase: string;
  description: string;
  temperature: number;
}

export const PHASES: Record<string, Phase> = {
  prototype: {
    name: "Prototype",
    description: "Idea generation, analysis, PRD, planning, and rapid prototyping",
    order: 0,
  },
  review: {
    name: "Review",
    description: "Critical analysis, inspection, git management, and silent failure detection",
    order: 1,
  },
  implement: {
    name: "Implement",
    description: "Feature integration, UI/UX, coding, debugging, linting, and task management",
    order: 2,
  },
  deploy: {
    name: "Deploy",
    description: "Deployment, infrastructure, and performance optimization",
    order: 3,
  },
  extend: {
    name: "Extend",
    description: "Architecture scalability and future-proofing",
    order: 4,
  },
  secure: {
    name: "Secure",
    description: "Security audits, vulnerability assessment, and secure architecture",
    order: 5,
  },
};

export const PHASE_ORDER = Object.keys(PHASES);

export const AGENTS: Record<string, Agent> = {
  // Prototype phase (5 agents)
  "prototype-idea": {
    name: "Prototype Idea",
    phase: "prototype",
    description: "Creative brainstorming and concept generation",
    temperature: 0.7,
  },
  "prototype-analyst": {
    name: "Prototype Analyst",
    phase: "prototype",
    description: "Requirements analysis and feasibility assessment",
    temperature: 0.3,
  },
  "prototype-prd": {
    name: "Prototype PRD",
    phase: "prototype",
    description: "Product Requirements Document creation",
    temperature: 0.2,
  },
  "prototype-plan": {
    name: "Prototype Plan",
    phase: "prototype",
    description: "Implementation planning and architecture design",
    temperature: 0.2,
  },
  "prototype-agent": {
    name: "Prototype Agent",
    phase: "prototype",
    description: "Rapid prototyping and PoC development",
    temperature: 0.4,
  },
  // Review phase (4 agents)
  "review-critic": {
    name: "Review Critic",
    phase: "review",
    description: "Critical analysis and constructive feedback",
    temperature: 0.3,
  },
  "review-inspector": {
    name: "Review Inspector",
    phase: "review",
    description: "Code quality and QA inspection",
    temperature: 0.2,
  },
  "review-git-expert": {
    name: "Review Git Expert",
    phase: "review",
    description: "Version control and repository management",
    temperature: 0.2,
  },
  "review-silent-failure-hunter": {
    name: "Review Silent Failure Hunter",
    phase: "review",
    description: "Identifies silent failures and inadequate error handling",
    temperature: 0.3,
  },
  // Implement phase (6 agents)
  "implement-features": {
    name: "Implement Features",
    phase: "implement",
    description: "Feature integration and coordination",
    temperature: 0.3,
  },
  "implement-uiux": {
    name: "Implement UI/UX",
    phase: "implement",
    description: "User interface and experience design",
    temperature: 0.4,
  },
  "implement-coder": {
    name: "Implement Coder",
    phase: "implement",
    description: "Core functionality implementation",
    temperature: 0.2,
  },
  "implement-debugger": {
    name: "Implement Debugger",
    phase: "implement",
    description: "Bug identification and resolution",
    temperature: 0.2,
  },
  "implement-linter": {
    name: "Implement Linter",
    phase: "implement",
    description: "Code quality and style enforcement",
    temperature: 0.1,
  },
  "implement-tasks": {
    name: "Implement Tasks",
    phase: "implement",
    description: "Task management and workflow coordination",
    temperature: 0.2,
  },
  // Deploy phase (2 agents)
  "deploy-agent": {
    name: "Deploy Agent",
    phase: "deploy",
    description: "Deployment and infrastructure management",
    temperature: 0.2,
  },
  "deploy-performance": {
    name: "Deploy Performance",
    phase: "deploy",
    description: "Performance optimization and monitoring",
    temperature: 0.3,
  },
  // Extend phase (1 agent)
  "extend-architect": {
    name: "Extend Architect",
    phase: "extend",
    description: "Architecture scalability and future-proofing",
    temperature: 0.3,
  },
  // Secure phase (2 agents)
  "secure-agent": {
    name: "Secure Agent",
    phase: "secure",
    description: "Security audits and vulnerability assessment",
    temperature: 0.2,
  },
  "secure-architect": {
    name: "Secure Architect",
    phase: "secure",
    description: "Secure architecture design and patterns",
    temperature: 0.3,
  },
};

export function getAgentsByPhase(phase: string): Agent[] {
  return Object.values(AGENTS).filter((a) => a.phase === phase);
}

export function getPhaseForAgent(agentName: string): string | null {
  const agent = AGENTS[agentName];
  return agent ? agent.phase : null;
}
