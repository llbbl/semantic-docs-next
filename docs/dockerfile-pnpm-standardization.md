# Dockerfile pnpm Standardization

## Overview

This document describes the migration from npm to pnpm in Docker builds, eliminating npm CVEs while maintaining compatibility with Corepack. This standardization applies to both the Dockerfile and GitHub Actions CI/CD workflows.

**Migration Date**: November 2025
**Strategy Applied**: Strategy B (No Registry Override)
**pnpm Version**: 10.22.0

---

## Architecture

### Multi-Stage Build Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        node:24-alpine                            │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│ Stage 1: BASE                                                    │
│ - Enable Corepack                                                │
│ - Read packageManager from package.json                          │
│ - Activate pnpm dynamically                                      │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│ Stage 2: DEPS                                                    │
│ - Copy package.json + pnpm-lock.yaml                            │
│ - Run: pnpm install --frozen-lockfile                           │
│ - Installs ALL dependencies (dev + prod)                        │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│ Stage 3: BUILDER                                                 │
│ - Copy dependencies from DEPS stage                              │
│ - Copy source files                                              │
│ - Initialize database (pnpm exec tsx scripts/init-db.ts)        │
│ - Index content (pnpm exec tsx scripts/index-content.ts)        │
│ - Build Next.js (pnpm build)                                    │
│ - Generates .next/standalone output                             │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│ Stage 4: PROD-DEPS                                               │
│ - Copy package.json + pnpm-lock.yaml                            │
│ - Run: pnpm install --frozen-lockfile --prod                    │
│ - Installs ONLY production dependencies                         │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│ Stage 5: RUNNER                                                  │
│ - Copy production dependencies from PROD-DEPS                   │
│ - Copy .next/standalone, .next/static, public from BUILDER      │
│ - Remove npm/npx binaries and Corepack shims                    │
│ - Run as non-root user (nextjs:nodejs)                          │
│ - Start: node server.js                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Version Synchronization Strategy

### Single Source of Truth: package.json

The `packageManager` field in `package.json` defines the pnpm version used across all environments:

```json
{
  "packageManager": "pnpm@10.22.0"
}
```

### How Each Environment Reads the Version

| Environment | Method | Details |
|-------------|--------|---------|
| **Dockerfile** | Dynamic extraction | `corepack prepare "$(node -p "require('./package.json').packageManager")"` |
| **GitHub Actions** | Auto-detection | `pnpm/action-setup@v4` with `run_install: false` reads from package.json |
| **Local Development** | Corepack | Reads packageManager field automatically |

### Update Process

To update the pnpm version:

1. Update `package.json`:
   ```json
   "packageManager": "pnpm@10.23.0"
   ```

2. Update the lockfile:
   ```bash
   corepack enable
   pnpm install
   ```

3. Commit both files:
   ```bash
   git add package.json pnpm-lock.yaml
   git commit -m "Update pnpm to 10.23.0"
   ```

**Important**: Never hardcode pnpm versions in Dockerfile or GitHub Actions workflows.

---

## Security Rationale

### npm CVE Elimination

This migration eliminates npm security vulnerabilities by:

1. **Complete npm Removal**: The runner stage explicitly removes:
   - `/usr/local/lib/node_modules/npm`
   - `/usr/local/bin/npm` and `/usr/local/bin/npx`
   - Corepack npm/npx shims

2. **Corepack Preservation**: Corepack itself is maintained for pnpm support, but npm-specific components are stripped.

3. **Attack Surface Reduction**: By removing npm entirely from production containers, we eliminate:
   - npm package installation vulnerabilities
   - npm registry compromise risks
   - npm CLI command injection vectors

### Security Benefits

| Before (npm) | After (pnpm) |
|--------------|--------------|
| npm installed in production | npm removed from production |
| npm CVEs present | npm CVEs eliminated |
| Flat node_modules (duplicates) | Content-addressed storage (deduplicated) |
| No integrity verification by default | Strict lockfile verification with `--frozen-lockfile` |

---

## Registry Configuration

### Strategy B: No Override Needed

This repository uses the standard public npm registry. No custom registry configuration was detected in `.npmrc` or `.pnpmrc`.

**Implementation**:
- No registry override in Dockerfile
- No registry override in GitHub Actions
- Standard Corepack behavior applies

**Verification**:
```bash
# Check registry configuration
cat .npmrc 2>/dev/null | grep -E "registry\s*=" || echo "Using default registry"
cat .pnpmrc 2>/dev/null | grep -E "registry\s*=" || echo "Using default registry"
```

If the output shows "Using default registry", Strategy B is correctly applied.

---

## Manual Verification

### 1. Verify pnpm Version Synchronization

```bash
# Check package.json
grep packageManager package.json

# Check installed pnpm version
pnpm --version

# Verify they match
node -p "require('./package.json').packageManager.split('@')[1]"
```

**Expected Output**: All three commands should show `10.22.0` (or the current version).

---

### 2. Verify Docker Build (Local)

```bash
# Build the Docker image
docker build -t semantic-docs:test \
  --build-arg TURSO_DB_URL=file:local.db \
  --build-arg TURSO_AUTH_TOKEN=dummy \
  --build-arg EMBEDDING_PROVIDER=local \
  .

# Verify npm is removed from the final image
docker run --rm semantic-docs:test sh -c "which npm && echo 'FAIL: npm found' || echo 'PASS: npm removed'"
docker run --rm semantic-docs:test sh -c "which npx && echo 'FAIL: npx found' || echo 'PASS: npx removed'"
docker run --rm semantic-docs:test sh -c "which pnpm && echo 'PASS: pnpm available' || echo 'FAIL: pnpm missing'"

# Verify the application starts
docker run --rm -p 3000:3000 semantic-docs:test
# Open http://localhost:3000 in browser
```

**Expected Results**:
- `PASS: npm removed`
- `PASS: npx removed`
- `PASS: pnpm available`
- Application loads successfully

---

### 3. Verify GitHub Actions Workflow

```bash
# Trigger CI workflow
git push origin claude/docker-npm-to-pnpm-01Vidi35ZJqscYSPRyjp92Qo

# Check workflow run
gh run list --workflow=ci.yml --limit=1

# View logs
gh run view --log
```

**Check for**:
- ✅ pnpm version matches package.json
- ✅ `pnpm install --frozen-lockfile` succeeds
- ✅ Tests pass
- ✅ Build completes

---

### 4. Verify Production Deployment

```bash
# Deploy to staging/production
docker build -t semantic-docs:prod \
  --build-arg TURSO_DB_URL=$TURSO_DB_URL \
  --build-arg TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN \
  --build-arg EMBEDDING_PROVIDER=local \
  .

# Run container
docker run -d -p 3000:3000 --name semantic-docs semantic-docs:prod

# Check health
curl -f http://localhost:3000/health || curl -f http://localhost:3000/

# Check logs
docker logs semantic-docs

# Verify npm is not present
docker exec semantic-docs sh -c "which npm" && echo "FAIL" || echo "PASS"
```

---

## Troubleshooting Guide

### Issue 1: `corepack: command not found`

**Symptom**: Build fails with `corepack: command not found`

**Cause**: Using a Node.js image that doesn't include Corepack (< Node 16.9.0)

**Solution**:
```dockerfile
# Ensure using node:24-alpine or newer
FROM node:24-alpine AS base
RUN corepack enable
```

---

### Issue 2: `pnpm: package.json not found`

**Symptom**: Build fails when trying to read packageManager field

**Cause**: `package.json` not copied before corepack prepare command

**Solution**: Verify Dockerfile stage order:
```dockerfile
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json ./  # Must come before corepack prepare
RUN corepack enable && \
    corepack prepare "$(node -p "require('./package.json').packageManager")" --activate
```

---

### Issue 3: Lockfile Mismatch

**Symptom**: `ERR_PNPM_OUTDATED_LOCKFILE`

**Cause**: `pnpm-lock.yaml` is out of sync with `package.json`

**Solution**:
```bash
# Regenerate lockfile
rm pnpm-lock.yaml
pnpm install

# Commit the updated lockfile
git add pnpm-lock.yaml
git commit -m "Update pnpm lockfile"
```

---

### Issue 4: GitHub Actions pnpm Version Mismatch

**Symptom**: CI uses wrong pnpm version

**Cause**: Hardcoded pnpm version in workflow or missing `run_install: false`

**Solution**: Verify workflow configuration:
```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v4
  with:
    run_install: false  # Auto-detects from package.json
```

---

### Issue 5: npm Still Present in Production Container

**Symptom**: `which npm` returns a path in the runner container

**Cause**: npm removal command failed silently or paths incorrect

**Solution**: Verify the removal command in Dockerfile:
```dockerfile
RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack/dist/npm*.js \
    /usr/local/lib/node_modules/corepack/dist/npx*.js \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /opt/corepack/shims/npm \
    /opt/corepack/shims/npx 2>/dev/null || true
```

Check for npm in the image:
```bash
docker run --rm <image> sh -c "find / -name npm 2>/dev/null"
```

---

### Issue 6: Build Fails During Database Initialization

**Symptom**: `pnpm exec tsx scripts/init-db.ts` fails

**Cause**: Missing build arguments or incorrect environment variables

**Solution**: Ensure build arguments are passed:
```bash
docker build \
  --build-arg TURSO_DB_URL=file:local.db \
  --build-arg TURSO_AUTH_TOKEN=dummy \
  --build-arg EMBEDDING_PROVIDER=local \
  .
```

For local testing, use local database:
- `TURSO_DB_URL=file:local.db`
- `TURSO_AUTH_TOKEN=dummy`

---

### Issue 7: pnpm-lock.yaml Ignored by Docker

**Symptom**: Docker build shows "no lockfile found" warnings

**Cause**: `pnpm-lock.yaml` listed in `.dockerignore`

**Solution**: Verify `.dockerignore`:
```bash
# Check .dockerignore
grep pnpm-lock.yaml .dockerignore

# Should be commented or absent
# pnpm-lock.yaml is needed for --frozen-lockfile builds
```

---

## Files Modified

### 1. `package.json`
- ✅ Added `packageManager` field: `"pnpm@10.22.0"`

### 2. `.dockerignore`
- ✅ Removed `pnpm-lock.yaml` from ignore list (commented with explanation)

### 3. `Dockerfile`
- ✅ Changed base image from `node:20-slim` to `node:24-alpine`
- ✅ Implemented 5-stage build: base → deps → builder → prod-deps → runner
- ✅ Dynamic pnpm version detection from `package.json`
- ✅ Explicit npm/npx removal in runner stage
- ✅ Preserved Corepack for pnpm support
- ✅ Used `--frozen-lockfile` for reproducible builds

### 4. `.github/workflows/ci.yml`
- ✅ Changed Node.js version from 20 to 24
- ✅ Updated `pnpm/action-setup@v4` with `run_install: false`
- ✅ Added pnpm store caching for faster CI builds
- ✅ Added `--frozen-lockfile` flag to pnpm install

---

## Constraints Adherence

### ✅ Checklist

- [x] Never deleted local `.npmrc` or `.pnpmrc` files (none existed)
- [x] Always use `--frozen-lockfile` for reproducible builds
- [x] Preserve Corepack while removing npm
- [x] Auto-detect pnpm version from `package.json`
- [x] No hardcoded pnpm versions in Dockerfile or workflows
- [x] Strategy B applied (no registry override)

---

## Next Steps

### For Developers

1. **Pull the changes**:
   ```bash
   git pull origin claude/docker-npm-to-pnpm-01Vidi35ZJqscYSPRyjp92Qo
   ```

2. **Verify local build**:
   ```bash
   pnpm install
   pnpm build
   ```

3. **Test Docker build**:
   ```bash
   docker build -t semantic-docs:local .
   ```

### For CI/CD

1. **Monitor GitHub Actions**: Check that CI passes on the feature branch
2. **Review build logs**: Ensure pnpm version matches package.json
3. **Validate production deployment**: Test in staging before merging

### For Maintainers

1. **Review PR**: Check all files modified
2. **Test locally**: Run verification commands above
3. **Merge to main**: After successful validation

---

## References

- [Corepack Documentation](https://nodejs.org/api/corepack.html)
- [pnpm Documentation](https://pnpm.io/)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [GitHub Actions pnpm/action-setup](https://github.com/pnpm/action-setup)
- [Next.js Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)

---

## Changelog

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-11-19 | 1.0.0 | Initial migration from npm to pnpm | Claude |

---

## Support

For issues or questions:
- Open an issue: https://github.com/llbbl/semantic-docs/issues
- Check troubleshooting guide above
- Review GitHub Actions logs for CI failures
