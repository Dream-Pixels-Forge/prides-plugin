---
trigger: phase:D OR deploy OR release OR infrastructure OR cicd OR docker
---

# Deploy Phase Rules

## Deployment Checklist
- [ ] Build succeeds locally
- [ ] All tests pass
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Health checks configured
- [ ] Monitoring/alerts set up

## Rollback Plan
Every deployment MUST have a rollback plan:
1. Previous version tag identified
2. Database migration reversal documented
3. Environment variable changes logged
4. One-command rollback possible

## Environment Management
- **Development**: Local, auto-deploy on push
- **Staging**: Mirror of production, manual promote
- **Production**: Protected branch, approval required

## Container Best Practices
- Multi-stage builds for smaller images
- Non-root user in container
- Health check in Dockerfile
- Pin base image versions

## CI/CD Pipeline
```
push → lint → test → build → deploy-staging → smoke-test → deploy-prod
```

## Monitoring
- Health check endpoint: `/health` or `/ready`
- Structured logging (JSON)
- Error tracking configured
- Performance metrics collected
