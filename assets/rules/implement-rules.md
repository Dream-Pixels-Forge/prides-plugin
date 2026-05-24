---
trigger: phase:I OR implement OR code OR tdd OR test OR feature OR fix
---

# Implement Phase Rules

## TDD Cycle (Non-Negotiable)
1. **RED**: Write ONE test that describes ONE behavior → must FAIL
2. **GREEN**: Write MINIMUM code to make test pass → no refactoring
3. **REFACTOR**: Only when ALL tests GREEN → remove duplication, improve names

**NEVER refactor while RED.**

## Vertical Slices
- Tasks span ALL integration layers (DB → API → Frontend)
- One feature at a time, fully integrated
- NO horizontal slicing (all DB, then all API, then all UI)

## Anti-Patterns (FORBIDDEN)
- NO horizontal slicing
- NO testing implementation (test behavior through public interfaces)
- NO mocking internal collaborators (mock external boundaries only)
- NO private method testing
- NO test bulk-writing (one test at a time)

## Commit Convention
```
type(scope): description

feat(auth): add OAuth2 Google provider
fix(api): handle null response in /users endpoint
test(auth): add CSRF token validation tests
refactor(db): extract connection pooling logic
```

## Code Quality Gates
- [ ] All tests pass
- [ ] Lint clean (no errors)
- [ ] No new TODO/FIXME without tracking issue
- [ ] Type safety maintained (no `any`)
- [ ] Error handling at boundaries
