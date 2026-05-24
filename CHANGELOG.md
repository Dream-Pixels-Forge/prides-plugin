# Changelog

## [1.0.0] - 2026-05-24

### Added
- PRIDES methodology plugin for OpenCode
- 16 swarm tools: heartbeat, gate, snapshot, context_write, context_read, status, incident, mcp_gate, transition, issue_open, issue_close, issue_comment, issue_list, session_recover, decay, decay_track
- 28 specialized agents organized by PRIDES phase (Prototype, Review, Implement, Deploy, Extend, Secure)
- 6 deterministic validation gate agents between phase transitions
- Ralph autonomous loop agent for batch issue resolution
- 7 path-scoped rules that load only when relevant to current phase
- Manus-style 3-file planning skill (task_plan.md, findings.md, progress.md)
- Spec-driven development skill (Propose → Apply → Archive)
- 4 automation scripts: validate-phase, heartbeat-check, context-prepare, state-snapshot
- Circuit breaker pattern for agent failure tracking
- Memory decay/promotion system for stale state management
- Context file strategy for high-fidelity subagent delegation
- Phase-aware MCP gating to reduce context noise
- Install/uninstall scripts for easy setup
- GitHub Actions workflow for automated npm publishing
