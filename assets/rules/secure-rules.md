---
trigger: phase:S OR secure OR security OR vulnerability OR audit OR compliance
---

# Secure Phase Rules

## Security Audit Checklist
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection enabled
- [ ] Authentication properly implemented
- [ ] Authorization checks on all endpoints
- [ ] Secrets not in code (env vars, secret manager)
- [ ] Dependencies audited (npm audit / pip-audit)
- [ ] HTTPS enforced
- [ ] Rate limiting on auth endpoints

## OWASP Top 10
1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable Components
7. Authentication Failures
8. Software Integrity Failures
9. Logging Failures
10. SSRF

## Dependency Security
```bash
npm audit --production
pip-audit
cargo audit
```

## Secrets Management
- Never commit .env files
- Use secret manager in production
- Rotate keys periodically
- Principle of least privilege

## Compliance
- License compatibility checked
- Data retention policies documented
- Privacy requirements met
- Security review artifacts saved

## Security Review Output
```markdown
## Security Audit Report
- Date: YYYY-MM-DD
- Auditor: secure-agent
- Scope: <what was reviewed>

### Findings
| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| SEC-001 | HIGH | SQL injection in /api/users | OPEN |
| SEC-002 | MED | Missing rate limit on /login | OPEN |

### Recommendations
1. ...
2. ...
```
