---
trigger: gate OR validation OR transition OR checkpoint
---

# Validation Gate Rules

## Gate Protocol
1. Run deterministic checks (bash commands, not LLM judgment)
2. Report pass/fail for each check
3. If ANY check fails → BLOCK transition
4. List failed checks with specific fix instructions
5. After fixes → re-run gate

## Gate Failure Response
1. Read the specific failed checks
2. Open an issue for each failure: `@swarm_issue_open`
3. Delegate to appropriate subagent to fix
4. After fix → close issue: `@swarm_issue_close`
5. Re-run gate

## Blocking Issues
- `critical`/`high` severity → automatically blocks transition
- `medium`/`low` severity → blocks only if `blocking: true`
- All blocking issues MUST be closed before gate passes

## Gate Commands
```
@swarm_gate from="I" to="D" results='{"tests_pass":"pass","lint_clean":"pass","no_regressions":"pass"}'
@swarm_issue_open title="..." severity="high" phase="I" ...
@swarm_issue_close id="ISS-0001" resolution="..." closedBy="..."
@swarm_issue_list status="open" blocking=true
```

## Compensation on Gate Failure
If gate fails after phase work was done:
1. Identify what needs rollback
2. Execute compensation for that phase
3. Fix the issue
4. Re-run the phase
5. Re-run the gate
