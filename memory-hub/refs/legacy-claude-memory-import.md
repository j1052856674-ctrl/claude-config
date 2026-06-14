---
id: mem-20260614-legacy-claude-memory-import
title: Legacy Claude memory import policy
type: ref
scope: global
status: active
source: codex
agents: [claude, codex]
created: 2026-06-14
updated: 2026-06-14
supersedes: []
conflicts_with: []
completeness: complete
confidence: high
needs_review: false
token_policy: index-only
---

# Legacy Claude memory import policy

Existing Claude memory locations are source material for UAM:

- `~\.claude\memory\`
- `E:\claude-config-master\memory\`
- `E:\claude-config-master\.claude\memory\`

They should not be treated as the final authority after equivalent records exist in `memory-hub/`.

## Import rules

- Preserve useful historical decisions as `decisions/` records.
- Preserve repeated mistakes and durable fixes as `lessons/` records.
- Mark uncertain imports as `completeness: partial` or `needs_review: true`.
- Do not import secrets, credentials, raw logs, or machine-local runtime state.
