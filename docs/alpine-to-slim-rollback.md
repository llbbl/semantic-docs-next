# Alpine to Debian Slim Rollback

## Date
2025-11-19

## Rollback Reason

### Error Encountered
```
Error: Error loading shared library ld-linux-aarch64.so.1: No such file or directory
(needed by /app/node_modules/.pnpm/onnxruntime-node@1.14.0/node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/onnxruntime_binding.node)
```

**Error Code**: `ERR_DLOPEN_FAILED`

**Build Stage**: Content indexing during `scripts/index-content.ts` execution

### Affected Packages
- **onnxruntime-node@1.14.0** - Primary failure point
  - Used by `@logan/libsql-search` for local embedding model (Xenova/all-MiniLM-L6-v2)
  - Requires glibc dynamic linker (`ld-linux-aarch64.so.1`)
  - Pre-compiled native bindings are incompatible with musl libc

### Root Cause
**Alpine Linux uses musl libc, while native Node.js addons (like onnxruntime-node) are compiled against glibc.**

The `onnxruntime-node` package provides pre-built native bindings for different platforms. The ARM64 Linux bindings expect glibc's dynamic linker (`ld-linux-aarch64.so.1`), which does not exist in Alpine's musl libc environment. This is a fundamental incompatibility that cannot be resolved without recompiling the native addon from source - which is often impractical or impossible for complex dependencies like ONNX Runtime.

## Size Comparison

| Image | Base | Final Size | Status |
|-------|------|------------|--------|
| Alpine (failed) | node:24-alpine (157 MB) | Build failed | ❌ Build fails at indexing |
| Debian Slim (optimized) | node:24-slim (~250 MB) | 1.06 GB | ✅ Works perfectly |

### Layer Breakdown (Debian Slim - Optimized)
| Layer | Size | Description |
|-------|------|-------------|
| Production node_modules | 716 MB | Largest component (includes native dependencies) |
| Next.js standalone build | 94.5 MB | Compiled Next.js application |
| Runtime essentials | 9.18 MB | ca-certificates + cleanup |
| Static assets | 900 KB | .next/static directory |
| Public files | 756 B | Public directory |
| Optimization layers | 0 B | npm/npx removal, file cleanup |

**Note**: The majority of image size (716 MB) comes from production dependencies, particularly those with native bindings. The base image difference (Alpine vs Debian) is ~90-100 MB, but this is offset by compatibility gains.

## Optimizations Applied

### 1. Multi-Stage Build Separation
- **Base stage**: Foundation with Corepack and pnpm configuration
- **Deps stage**: Full dependencies for building
- **Builder stage**: Application build with database initialization
- **Prod-deps stage**: Production-only dependencies
- **Runner stage**: Minimal runtime with aggressive cleanup

### 2. Aggressive Debian Cleanup
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && rm -rf /tmp/* /var/tmp/* \
    && rm -rf /usr/share/doc/* \
    && rm -rf /usr/share/man/* \
    && rm -rf /usr/share/locale/* \
    && rm -rf /var/log/*
```
This removes ~50-100 MB of unnecessary Debian documentation, locales, and cache files.

### 3. npm/npx Elimination
Removes npm and npx binaries while preserving Corepack, eliminating npm CVE surface area:
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

### 4. Node.js Module Cleanup
Removes unnecessary files from Node.js core modules:
```dockerfile
RUN find /usr/local/lib/node_modules -name "*.md" -delete 2>/dev/null || true && \
    find /usr/local/lib/node_modules -name "*.txt" -delete 2>/dev/null || true && \
    find /usr/local/lib/node_modules -name "*.map" -delete 2>/dev/null || true && \
    find /usr/local/lib/node_modules -name "test" -type d -prune -exec rm -rf {} + && \
    find /usr/local/lib/node_modules -name "tests" -type d -prune -exec rm -rf {} + && \
    find /usr/local/lib/node_modules -name "*.d.ts" -delete 2>/dev/null || true
```

### 5. Production Dependencies Only
Uses `pnpm install --frozen-lockfile --prod` in the runner stage to exclude devDependencies (reduces ~177 packages to 114).

## Testing Results

### ✅ Local Build
- Build completed successfully in ~60 seconds
- All stages passed without errors
- Content indexing completed: 3/3 documents indexed
- Next.js build generated 8 static pages

### ✅ Native Dependencies
- **onnxruntime-node**: Loaded successfully with glibc
- **sharp**: Install hooks passed
- **@libsql/client**: Database operations working
- Local embedding model (Xenova/all-MiniLM-L6-v2) loaded correctly

### ✅ Application Startup
```bash
docker run -p 3000:3000 app-slim-optimized
# HTTP server responding successfully on port 3000
# Health checks passing
```

### ✅ Performance
- Startup time: ~2-3 seconds
- Memory usage: Normal (no regressions)
- Application functionality: All features working correctly

## Technical Details

### Why Alpine Failed
1. **musl libc vs glibc**: Alpine uses musl, a lightweight alternative to glibc
2. **Native addon compatibility**: onnxruntime-node ships pre-built binaries compiled against glibc
3. **Dynamic linker mismatch**: The binary expects `/lib/ld-linux-aarch64.so.1` (glibc's loader), not musl's `/lib/ld-musl-aarch64.so.1`
4. **No fallback**: No musl-compatible binaries available, and building from source is impractical

### Why Debian Slim Works
1. **glibc standard**: Debian Slim uses glibc, the standard C library for Linux
2. **Binary compatibility**: Native addons work out-of-the-box
3. **Broader ecosystem support**: Most Node.js native modules target glibc
4. **Stability**: Well-tested for production workloads

## Recommendations

### When to Use Alpine
- ✅ Pure JavaScript applications (no native dependencies)
- ✅ Size-critical deployments where you can build from source
- ✅ Applications using Alpine-compatible native modules

### When to Use Debian Slim
- ✅ Applications with native Node.js dependencies (sharp, bcrypt, canvas, onnxruntime)
- ✅ Machine learning workloads (TensorFlow, ONNX, etc.)
- ✅ When stability and compatibility > image size
- ✅ Production environments requiring broad ecosystem support

## Future Considerations

### Option 1: Keep Debian Slim (Recommended)
**Pros:**
- Proven compatibility with all dependencies
- Better ecosystem support
- Lower maintenance burden

**Cons:**
- ~90-100 MB larger base image

### Option 2: Return to Alpine (Not Recommended)
Would require:
1. Switching to cloud embedding providers (Gemini/OpenAI) instead of local ONNX models
2. Removing onnxruntime-node dependency from libsql-search
3. Potential loss of offline embedding capability
4. Risk of future compatibility issues with other native deps

**Verdict**: The ~100 MB size increase is justified by the stability, compatibility, and reduced maintenance overhead of Debian Slim.

## Related Documentation
- [Dockerfile pnpm Standardization](./dockerfile-pnpm-standardization.md)
- [SECURITY.md](./SECURITY.md)

## References
- Alpine vs Debian: https://pythonspeed.com/articles/alpine-docker-python/
- musl vs glibc compatibility: https://wiki.musl-libc.org/functional-differences-from-glibc.html
- Node.js native addons: https://nodejs.org/api/addons.html
