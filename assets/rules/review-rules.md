---
trigger: phase:R OR review OR code-review OR inspection OR architecture
---

# Review Phase Rules

## Inspection Checklist
- Logic errors and edge cases
- Null/undefined handling
- Error handling gaps
- Code smells (duplication, long methods, tight coupling)
- SOLID and DRY principles
- Naming conventions

## Severity Levels
- **Error**: Bug, security issue, data loss risk
- **Warning**: Code smell, maintainability concern
- **Info**: Style suggestion, minor improvement

## Review Output Format
```markdown
## Review Summary
- Files reviewed: N
- Errors: N
- Warnings: N
- Info: N

## Issues
### [ERROR] file.ts:42
Description of issue.
Suggested fix: ...

### [WARNING] file.ts:78
Description of issue.
```

## Architecture Review
- System boundaries clearly defined
- Data flow documented
- Integration points identified
- Scalability considerations addressed
- Security surface area reviewed

## Git Health
- Clean commit history
- No merge conflicts
- Branch strategy followed
- Commit messages follow convention
