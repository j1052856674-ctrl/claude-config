---
id: mem-20260614-codex-inherits-claude-practice-rules
title: Codex inherits proven Claude practice rules
type: decision
scope: global
status: active
source: human
agents: [codex, claude]
created: 2026-06-14
updated: 2026-06-14
supersedes: []
conflicts_with: []
completeness: complete
confidence: high
needs_review: false
token_policy: selective-read
---

# Codex inherits proven Claude practice rules

## Decision

Codex should inherit most proven practice rules from the existing Claude global rules, adapted to Codex terminology and capabilities instead of copied as Claude-specific mechanics.

## Included rule families

- Chinese-first communication and `fan` addressing preference.
- Plan-first behavior for non-trivial tasks.
- Evidence-based action: read files and command output before judging.
- Small, precise edits and respect for user changes.
- Risk-scaled validation and honest reporting when validation cannot run.
- Git/file safety, especially confirmation before destructive operations.
- Universal Agent Memory as the shared durable memory layer.
- Project startup discipline: read local rules and memory indexes before acting.
- Single-source-of-truth rules for config, logic, memory, and skill ownership.
- Failure discipline: diagnose root cause, stop after repeated failed attempts, record repeated lessons.
- Skill ecosystem discipline: one authority per capability, orchestrators compose rather than duplicate.
- Sensitive information protection and least-privilege behavior.

## Adaptation rule

When a Claude rule is valuable but references Claude-only paths or mechanics, preserve the intent and rewrite the mechanism for Codex/UAM. Do not reduce the migration to a small adapter-only appendix.
