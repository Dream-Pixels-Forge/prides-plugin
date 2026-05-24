---
trigger: phase:E OR extend OR architecture OR scale OR refactor OR growth
---

# Extend Phase Rules

## Architecture Principles
- Design for 10x current load, not 100x
- Prefer horizontal over vertical scaling
- Clear service boundaries
- API-first design

## Scalability Checklist
- [ ] Database query performance reviewed
- [ ] Caching strategy defined
- [ ] Rate limiting implemented
- [ ] Connection pooling configured
- [ ] Background job processing set up

## Technology Selection
- Prefer boring technology for critical paths
- New tech requires: problem statement, alternatives considered, migration plan
- Document decision rationale in ADR

## Architecture Decision Record (ADR)
```markdown
# ADR-NNN: Title

## Status
Proposed | Accepted | Deprecated

## Context
What is the issue we're facing?

## Decision
What did we decide?

## Consequences
What are the trade-offs?
```

## Code Organization
- Modules have clear responsibilities
- Dependencies flow in one direction
- Shared code extracted to utilities
- Configuration separated from logic
