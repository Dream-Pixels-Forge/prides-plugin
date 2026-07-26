# PRIDES Agent System

A comprehensive multi-agent system implementing the PRIDES methodology (Prototype, Review, Implement, Deploy, Extend, Secure) for complete software development lifecycle management.

## Overview

The PRIDES agent system is a hierarchical multi-agent architecture that coordinates specialized subagents through a master orchestrator agent. Each phase contains purpose-built agents optimized for specific tasks within the development workflow.

### Architecture

```
PRIDES (Master Orchestrator)
├── PROTOTYPE Phase
│   ├── prototype-idea      - Creative brainstorming & concept generation
│   ├── prototype-analyst   - Requirements analysis & feasibility assessment
│   ├── prototype-prd       - Product Requirements Document creation
│   ├── prototype-plan      - Implementation planning & architecture
│   └── prototype-agent     - Rapid prototyping & PoC development
│
├── REVIEW Phase
│   ├── review-critic       - Critical analysis & constructive feedback
│   ├── review-inspector   - Code quality & QA inspection
│   └── review-git-expert  - Version control & repository management
│
├── IMPLEMENT Phase
│   ├── implement-features  - Feature integration & coordination
│   ├── implement-uiux      - User interface & experience design
│   ├── implement-coder     - Core functionality implementation
│   ├── implement-debugger  - Bug identification & resolution
│   ├── implement-linter    - Code quality & style enforcement
│   └── implement-tasks    - Task management & workflow coordination
│
├── DEPLOY Phase
│   ├── deploy-agent        - Deployment & infrastructure management
│   └── deploy-performance  - Performance optimization & monitoring
│
├── EXTEND Phase
│   └── extend-architect   - Architecture scalability & future-proofing
│
└── SECURE Phase
    ├── secure-agent        - Security audits & vulnerability assessment
    └── secure-architect   - Secure architecture design & patterns
```

---

## Configuration

### JSON Configuration

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "prides": {
      "description": "Master coordinator agent that orchestrates the PRIDES methodology (Prototype, Review, Implement, Deploy, Secure). Manages workflow between all phase subagents and ensures comprehensive software development lifecycle coverage.",
      "mode": "primary",
      "temperature": 0.3,
      "color": "#6366f1",
      "prompt": "{file:./prompts/prides.txt}",
      "permission": {
        "task": {
          "*": "allow"
        }
      },
      "tools": {
        "write": true,
        "edit": true,
        "bash": true
      }
    }
  }
}
```

### Task Permissions

Configure which subagents the master orchestrator can invoke:

```json
{
  "agent": {
    "prides": {
      "permission": {
        "task": {
          "prototype-*": "allow",
          "review-*": "allow",
          "implement-*": "allow",
          "deploy-*": "allow",
          "extend-*": "allow",
          "secure-*": "allow"
        }
      }
    }
  }
}
```

---

## Agent Reference

### Master Orchestrator

---

#### PRIDES (Master Coordinator)

*Mode*: `primary`

Master orchestrator that manages the entire PRIDES methodology workflow. Coordinates all phase subagents and ensures smooth transitions between development lifecycle stages.

| Property | Value |
|----------|-------|
| Temperature | 0.3 |
| Color | `#6366f1` (Indigo) |
| Tools | write, edit, bash |
| Model | Default (inherited) |

**Subagent Access**: All PRIDES subagents

---

### Prototype Phase

The Prototype phase focuses on ideation, analysis, planning, and creating initial proof-of-concepts.

---

#### prototype-idea

*Mode*: `subagent`

Generates innovative ideas and conceptual solutions. Brainstorms creative approaches and identifies potential opportunities for the project.

| Property | Value |
|----------|-------|
| Temperature | 0.7 |
| Color | `#f59e0b` (Amber) |
| Model | big pickle |
| Tools | bash |

**Use Cases**:
- Brainstorming new features
- Identifying project opportunities
- Generating creative solutions
- Exploring alternative approaches

---

#### prototype-analyst

*Mode*: `subagent`

Analyzes requirements, constraints, and feasibility. Evaluates technical viability and identifies risks and dependencies.

| Property | Value |
|----------|-------|
| Temperature | 0.2 |
| Color | `#10b981` (Emerald) |
| Model | big pickle |
| Tools | bash |

**Use Cases**:
- Requirements analysis
- Technical feasibility assessment
- Risk identification
- Dependency mapping

---

#### prototype-prd

*Mode*: `subagent`

Creates comprehensive Product Requirements Documents. Translates ideas and analysis into structured, actionable specifications.

| Property | Value |
|----------|-------|
| Temperature | 0.2 |
| Color | `#8b5cf6` (Violet) |
| Model | big pickle |
| Tools | write, edit |

**Use Cases**:
- Writing product requirement documents
- Creating feature specifications
- Defining user stories
- Documenting acceptance criteria

---

#### prototype-plan

*Mode*: `subagent`

Develops detailed implementation plans and architecture. Creates roadmaps, task breakdowns, and technical specifications.

| Property | Value |
|----------|-------|
| Temperature | 0.1 |
| Color | `#06b6d4` (Cyan) |
| Model | big pickle |
| Tools | write, edit |
| Permissions | bash: deny |

**Use Cases**:
- Creating implementation roadmaps
- Task decomposition
- Technical specification writing
- Milestone planning

---

#### prototype-agent

*Mode*: `subagent`

Creates rapid prototypes and proof-of-concepts. Builds quick iterations to validate ideas and demonstrate functionality.

| Property | Value |
|----------|-------|
| Temperature | 0.4 |
| Color | `#ec4899` (Pink) |
| Tools | write, edit, bash |

**Use Cases**:
- Building proof-of-concepts
- Rapid prototyping
- Feature validation
- Demo creation

---

### Review Phase

The Review phase ensures code quality, maintains standards, and manages version control.

---

#### review-critic

*Mode*: `subagent`

Provides critical analysis and constructive feedback. Reviews code, architecture, and decisions for quality and best practices.

| Property | Value |
|----------|-------|
| Temperature | 0.2 |
| Color | `#ef4444` (Red) |
| Tools | bash |

**Use Cases**:
- Architecture reviews
- Code quality assessment
- Best practices validation
- Constructive feedback provision

---

#### review-inspector

*Mode*: `subagent`

Performs thorough code inspection and quality assurance. Identifies bugs, code smells, and areas for improvement.

| Property | Value |
|----------|-------|
| Temperature | 0.1 |
| Color | `#f97316` (Orange) |
| Tools | bash |

**Use Cases**:
- Code inspection
- Bug detection
- Code smell identification
- Quality assurance

---

#### review-git-expert

*Mode*: `subagent`

Manages version control, branching strategies, and merge processes. Handles conflicts and maintains repository health.

| Property | Value |
|----------|-------|
| Temperature | 0.1 |
| Color | `#84cc16` (Lime) |
| Model | big pickle |
| Tools | bash |
| Permissions | bash: git status*, git log*, git diff*, git branch* (allow), others (ask) |

**Use Cases**:
- Branch management
- Merge conflict resolution
- Repository maintenance
- Version control strategy

---

### Implement Phase

The Implement phase handles feature development, UI/UX, coding, debugging, and task management.

---

#### implement-features

*Mode*: `subagent`

Helps integrate features into the project without breaking existing functionality. Coordinates feature implementation across the codebase.

| Property | Value |
|----------|-------|
| Temperature | 0.3 |
| Color | `#a855f7` (Purple) |
| Tools | write, edit, bash |

**Use Cases**:
- Feature integration
- Breaking change prevention
- Feature coordination
- Cross-module implementation

---

#### implement-uiux

*Mode*: `subagent`

Designs and implements user interfaces. Focuses on UX principles, accessibility, and responsive design.

| Property | Value |
|----------|-------|
| Temperature | 0.3 |
| Color | `#a855f7` (Purple) |
| Tools | write, edit, bash |

**Use Cases**:
- UI component development
- UX optimization
- Responsive design implementation
- Accessibility compliance

---

#### implement-coder

*Mode*: `subagent`

Implements core functionality and business logic. Writes clean, maintainable, and well-tested code.

| Property | Value |
|----------|-------|
| Temperature | 0.2 |
| Color | `#3b82f6` (Blue) |
| Tools | write, edit, bash |

**Use Cases**:
- Core logic implementation
- Business logic development
- Feature coding
- Test-driven development

---

#### implement-debugger

*Mode*: `subagent`

Identifies and resolves bugs and issues. Performs root cause analysis and implements fixes.

| Property | Value |
|----------|-------|
| Temperature | 0.1 |
| Color | `#14b8a6` (Teal) |
| Tools | write, edit, bash |

**Use Cases**:
- Bug identification
- Root cause analysis
- Issue resolution
- Debugging complex problems

---

#### implement-linter

*Mode*: `subagent`

Ensures code quality and consistency. Applies linting rules, formatting standards, and code style guidelines.

| Property | Value |
|----------|-------|
| Temperature | 0.1 |
| Color | `#64748b` (Slate) |
| Model | big pickle |
| Tools | write, edit, bash |

**Use Cases**:
- Code style enforcement
- Linting configuration
- Formatting standards
- Quality control

---

#### implement-tasks

*Mode*: `subagent`

Manages task breakdown and progress tracking. Creates and maintains task lists and coordinates implementation workflow.

| Property | Value |
|----------|-------|
| Temperature | 0.2 |
| Color | `#0ea5e9` (Sky) |
| Model | big pickle |
| Tools | write, edit |

**Use Cases**:
- Task creation and management
- Progress tracking
- Workflow coordination
- Sprint planning support

---

### Deploy Phase

The Deploy phase manages deployment, infrastructure, and performance optimization.

---

#### deploy-agent

*Mode*: `subagent`

Handles deployment processes and infrastructure. Manages CI/CD pipelines and environment configurations.

| Property | Value |
|----------|-------|
| Temperature | 0.1 |
| Color | `#22c55e` (Green) |
| Tools | write, edit, bash |
| Permissions | bash: docker*, npm run build*, bun run build* (allow), others (ask) |

**Use Cases**:
- CI/CD pipeline management
- Environment configuration
- Deployment automation
- Infrastructure management

---

#### deploy-performance

*Mode*: `subagent`

Optimizes application performance and monitors metrics. Identifies bottlenecks and implements optimizations.

| Property | Value |
|----------|-------|
| Temperature | 0.1 |
| Color | `#eab308` (Yellow) |
| Tools | write, edit, bash |

**Use Cases**:
- Performance profiling
- Bottleneck identification
- Optimization implementation
- Metric monitoring

---

### Extend Phase

The Extend phase focuses on scalability and future-proofing the architecture.

---

#### extend-architect

*Mode*: `subagent`

Specialist for architecture scalability and project growth. Designs systems that can scale and evolve with project requirements.

| Property | Value |
|----------|-------|
| Temperature | 0.1 |
| Color | `#dc2626` (Red) |
| Tools | write, edit, bash |

**Use Cases**:
- Scalability planning
- Architecture design
- Technical debt management
- Future-proof system design

---

### Secure Phase

The Secure phase ensures security audits, vulnerability assessment, and secure architecture.

---

#### secure-agent

*Mode*: `subagent`

Performs security audits and implements security measures. Identifies vulnerabilities and ensures compliance.

| Property | Value |
|----------|-------|
| Temperature | 0.1 |
| Color | `#dc2626` (Red) |
| Tools | write, edit, bash |

**Use Cases**:
- Security auditing
- Vulnerability assessment
- Compliance checking
- Security implementation

---

#### secure-architect

*Mode*: `subagent`

Designs secure system architecture. Implements security patterns and ensures defense-in-depth strategies.

| Property | Value |
|----------|-------|
| Temperature | 0.1 |
| Color | `#7c3aed` (Purple) |
| Tools | write, edit |

**Use Cases**:
- Security architecture design
- Defense-in-depth implementation
- Security pattern selection
- Threat modeling

---

## Usage

### Invoking Agents

1. **Master Orchestrator**: Use Tab key to switch to PRIDES as the primary agent
2. **Subagents**: @ mention any subagent in your messages

### Example Workflow

```
@prides Create a new authentication system

The PRIDES orchestrator will:
1. prototype-idea      → Brainstorm authentication approaches
2. prototype-analyst   → Evaluate security requirements
3. prototype-prd      → Document authentication specs
4. prototype-plan     → Plan implementation steps
5. prototype-agent    → Build authentication PoC
6. review-critic      → Review architecture decisions
7. implement-coder   → Implement authentication
8. implement-debugger→ Fix any issues
9. deploy-agent      → Deploy to staging
10. secure-agent     → Security audit
```

---

## Temperature Guidelines

| Range | Use Case |
|-------|----------|
| 0.0-0.2 | Focused analysis, planning, security, reviews |
| 0.3-0.5 | Balanced development, feature implementation |
| 0.6-0.8 | Creative brainstorming, ideation |
| 0.9-1.0 | Maximum creativity (use sparingly) |

---

## Color Reference

| Phase | Color | Hex |
|-------|-------|-----|
| Master | Indigo | `#6366f1` |
| Prototype | Amber/Emerald/Violet/Cyan/Pink | `#f59e0b`, `#10b981`, `#8b5cf6`, `#06b6d4`, `#ec4899` |
| Review | Red/Orange/Lime | `#ef4444`, `#f97316`, `#84cc16` |
| Implement | Purple/Blue/Teal/Slate/Sky | `#a855f7`, `#3b82f6`, `#14b8a6`, `#64748b`, `#0ea5e9` |
| Deploy | Green/Yellow | `#22c55e`, `#eab308` |
| Extend | Red | `#dc2626` |
| Secure | Red/Purple | `#dc2626`, `#7c3aed` |

---

## Best Practices

1. **Start with the Master Orchestrator**: Let PRIDES coordinate which subagents to invoke
2. **Use Appropriate Temperature**: Lower for analysis/security, higher for ideation
3. **Leverage Phase Transitions**: Move through phases systematically
4. **Review Before Implement**: Always use review agents before completing implementation
5. **Secure Early**: Run security audits before deployment
6. **Extend Continuously**: Use extend-architect for long-term project health
