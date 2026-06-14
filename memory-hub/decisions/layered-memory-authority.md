---
id: mem-20260614-layered-memory-authority
title: Layered memory authority for Claude and Codex
type: decision
scope: global
status: active
source: human
agents: [claude, codex]
created: 2026-06-14
updated: 2026-06-14
bridge: false
supersedes: [mem-20260614-shared-memory-design]
conflicts_with: []
completeness: complete
confidence: high
needs_review: false
token_policy: selective-read
---

# Layered memory authority for Claude and Codex

## Decision

UAM uses three memory layers:

1. Project-local `<project>/memory-hub/` is the authority for project-specific state.
2. Agent system roots `~/.claude/` and `~/.codex/` are runtime adapters and caches.
3. `E:\个人仓库\03_Knowledge\记忆中枢\` is the authority for long-term reusable knowledge.

`E:\claude-config-master\memory-hub\` remains the protocol/config index for this configuration repository, not the universal dumping ground for every project memory.

## Implications

- task-snapshot writes project facts to local project `memory-hub/`.
- memory-bridge curates `bridge: true` records into the personal knowledge vault.
- Claude/Codex system roots may point to the protocol but should not become the long-term knowledge authority.
- Long-term vault entries must be generalized, deduplicated, and desensitized.
