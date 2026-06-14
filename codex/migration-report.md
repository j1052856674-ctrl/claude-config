# Codex Migration Report

## Current Batch

Created `codex/` as the Codex-specific staging and installation source.

## Migrated Skills

- `tech-spec`
- `task-snapshot`
- `review-need`
- `review-approach`
- `review-tech`
- `review-code`
- `review-fix-verify`
- `dev-workflow`

## Converted Assets

- `agents/*.md` -> `codex/prompts/agents/*.md`
- `commands/auto-mode.md` -> `codex/workflows/auto-mode.md`
- `agent-knowledge/` -> `codex/references/agent-knowledge/`

## Not Yet Migrated

High-value but needs adaptation:

- `prd-v3`
- `frontend`
- `drawio-skill`
- `deep-review`
- `agent-builder`
- `auto-mode` as a formal skill
- `memory-bridge`

Complex and deferred:

- `deep-research`
- `impeccable`

## Deployment

Use `bash codex/sync-codex.sh status` first. Use `bash codex/sync-codex.sh deploy` only after reviewing the staged files.

The deploy script touches only:

- `~/.codex/AGENTS.md`
- `~/.codex/skills/`
- `~/.codex/prompts/`
- `~/.codex/workflows/`
- `~/.codex/references/`

It does not touch auth, config, logs, SQLite state, sessions, caches, or sandbox data.

## Validation Notes

- `codex/` currently contains 8 migrated skills and 7 converted agent prompt templates.
- `sync-codex.ps1 status` works on this Windows machine.
- `sync-codex.sh` is kept for Bash-compatible environments, but Windows drive path mapping may require running it from an environment where `E:` is mounted.
- Keyword scan found remaining Claude-specific references inside migrated prompts/references/skills. These are expected in the staging copy and should be adapted before final deployment if they affect runtime behavior.
## 2026-06-14 Deployment Update

Validated and deployed 15 Codex skills to `~/.codex/skills`:

- `agent-builder`
- `auto-mode`
- `deep-review`
- `dev-workflow`
- `drawio-skill`
- `frontend`
- `memory-bridge`
- `prd-v3`
- `review-approach`
- `review-code`
- `review-fix-verify`
- `review-need`
- `review-tech`
- `task-snapshot`
- `tech-spec`

Also deployed:

- 7 prompt templates to `~/.codex/prompts/agents`
- 1 workflow to `~/.codex/workflows`
- 17 reference files to `~/.codex/references`

Post-deploy validation:

- All 15 deployed skills have `SKILL.md`.
- Legacy Claude memory/skill path scan returned no blocking matches for deployed skills.
- `deep-research` and `impeccable` remain deferred because they include Playwright/npx/browser/live-server dependencies and large runtime scripts.
## 2026-06-14 Claude Native Memory Update

Updated Claude-native memory handling in repository assets and synchronized the changed files into `~/.claude/skills`.

Changed memory-related references in:

- `skills/agent-builder/SKILL.md`
- `skills/agent-builder/references/agent-prompt-design-spec.md`
- `skills/deep-review/SKILL.md`
- `skills/deep-review/references/review-output.md`
- `skills/memory-bridge/SKILL.md`
- `skills/review-fix-verify/SKILL.md`
- `skills/task-snapshot/SKILL.md`

Scope boundary:

- Updated memory write/read/index/bridge behavior to layered UAM: project-local `memory-hub/` first, config hub for protocol/migration state, and the personal knowledge vault for long-term reusable knowledge.
- Preserved Claude runtime paths such as `~/.claude/agents` and `~/.claude/skills` where they are still valid for Claude Code.
- Did not adapt deferred runtime-heavy skills `deep-research` and `impeccable`.
## 2026-06-14 Layered Memory Authority Update

Adjusted the memory model to three layers:

1. Project-local `<project>/memory-hub/` is the authority for project-specific state.
2. Agent runtime roots `~/.claude` and `~/.codex` are adapters/caches/import sources.
3. Long-term reusable knowledge is curated into `E:\个人仓库\03_Knowledge\记忆中枢\`.

`E:\claude-config-master\memory-hub\` now acts as the protocol/config migration index, not as the dumping ground for all project memory.

Updated UAM spec, Claude/Codex adapters, `memory-bridge`, `task-snapshot`, `deep-review`, and `review-fix-verify` in both repository staging and active runtime roots.