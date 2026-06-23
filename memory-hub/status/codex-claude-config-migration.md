---
id: mem-20260614-codex-claude-config-migration
title: Codex and Claude config migration status
type: status
scope: global
status: active
source: codex
agents: [claude, codex]
created: 2026-06-14
updated: 2026-06-23
supersedes: []
conflicts_with: []
completeness: partial
confidence: high
needs_review: false
token_policy: selective-read
---

# Codex and Claude config migration status

## Current state

- `E:\claude-config` is the Git-tracked configuration repository.
- `memory-hub/` in this repository is the UAM protocol/config hub, not the universal project-memory authority.
- Project-specific facts belong in each project-local `<project>/memory-hub/`; reusable long-term knowledge is curated into `E:\个人仓库\03_Knowledge\记忆中枢\`.
- Existing Claude assets under `skills/`, `agents/`, `commands/`, `agent-knowledge/`, and `memory/` are migration sources.
- Codex global rules should point to the layered UAM model and this repository's config hub through `~\.codex\AGENTS.md`.
- Claude global and repository rules should point to the layered UAM model through `~\.claude\CLAUDE.md` and `E:\claude-config\CLAUDE.md`.

## Next migration priorities

1. Normalize first-batch low-risk skills for Codex.
2. Convert Claude agents into Codex prompt/reference assets.
3. Rewrite sync logic only after the shared memory protocol is stable.
4. Reset or force-update GitHub only after local diff review and explicit user confirmation.

## 2026-06-14 Codex staging update

- Created `E:\claude-config\codex` as the Codex-specific staging and installation source.
- Copied 8 low-risk skills into `codex/skills`.
- Converted 7 Claude agent definitions into `codex/prompts/agents` prompt templates.
- Converted `commands/auto-mode.md` into `codex/workflows/auto-mode.md`.
- Copied `agent-knowledge/` into `codex/references/agent-knowledge/`.
- Added `sync-codex.sh` and `sync-codex.ps1`; the PowerShell `status` path is verified on Windows.
- Do not deploy with `sync-codex.ps1 deploy` until staged Claude-specific references are reviewed.

## 2026-06-14 Codex deployment update

- Deployed 15 validated Codex skills from `E:\claude-config\codex\skills` to `~\.codex\skills`.
- Deployed prompt templates, workflow, and references from `codex/` to `~\.codex`.
- Verified all target skills have `SKILL.md`.
- Verified no blocking legacy Claude memory/skill paths remain in deployed target skills.
- Deferred `deep-research` and `impeccable` pending separate dependency/runtime validation.

## 2026-06-14 Claude native memory update

- Updated Claude-native skills so memory write/read/index/bridge behavior follows layered UAM: project-local `memory-hub/` for project facts, config hub for protocol/migration state, and the personal knowledge vault for long-term reusable knowledge.
- Synchronized changed files into `~\.claude\skills` without running full `sync.sh deploy`.
- Preserved Claude runtime paths (`~/.claude/agents`, `~/.claude/skills`) because those remain valid Claude Code mechanics.
- Deferred `deep-research` and `impeccable` memory/path adaptation pending separate runtime validation.

## 2026-06-14 layered memory authority update

- Reframed UAM into three layers: project-local `memory-hub`, agent runtime adapters, and long-term vault `E:\个人仓库\03_Knowledge\记忆中枢`.
- `E:\claude-config\memory-hub` is now protocol/config migration memory, not the universal project-memory authority.

## 2026-06-23 system entrypoint and sync skill update

- Synchronized self-contained Claude/Codex global entrypoints into the config source repository:
  - `CLAUDE.md`
  - `codex/AGENTS.md`
- Synchronized the refreshed `memory-bridge` Skill to Claude source, Codex source, and Claude runtime.
- Added `sync-agent-config` to capture the recurring workflow for repo/runtime/GitHub synchronization.
- Updated active config manifests from the historical `E:\claude-config-master` path to `E:\claude-config`; old path strings remain only as historical aliases.
- Updated Claude/Codex adapters and memory-related skills to local-first writes with long-term bridge curation.
