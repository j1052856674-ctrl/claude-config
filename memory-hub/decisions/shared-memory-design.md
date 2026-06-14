---
id: mem-20260614-shared-memory-design
title: Shared Claude and Codex memory hub
type: decision
scope: global
status: deprecated
source: human
agents: [claude, codex]
created: 2026-06-14
updated: 2026-06-14
bridge: false
supersedes: []
superseded_by: [mem-20260614-layered-memory-authority]
conflicts_with: []
completeness: complete
confidence: high
needs_review: false
token_policy: selective-read
---

# Shared Claude and Codex memory hub

> Deprecated: this decision is superseded by `mem-20260614-layered-memory-authority`. Keep this file as historical context only; do not treat it as the active UAM authority model.

Claude and Codex should not maintain separate authoritative long-term memories. Both tools use `E:\claude-config-master\memory-hub` as the durable memory authority.

## Decision

- `memory-hub/` is the single source of truth for durable cross-agent memory.
- Claude-specific memory folders and Codex-specific memory stores are adapters, caches, or import sources.
- Agents read `MEMORY.md` first, then `manifests/active.json`, then only task-relevant detail files.
- Conflicts are explicit records under `conflicts/`; agents must not silently overwrite each other.
- New durable memories require frontmatter and index updates.

## Rationale

The previous Claude memory design saved tokens by using short indexes and scoped detail reads. UAM keeps that advantage while avoiding memory drift between Claude and Codex.

## Operating rule

When a task produces durable context, write or update the relevant `memory-hub/` record and update the index. If a legacy `.claude/memory/` record exists, treat it as source material, not as final authority.
