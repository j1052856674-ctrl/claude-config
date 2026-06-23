---
name: sync-agent-config
description: Use when syncing Claude/Codex agent configuration between runtime roots, E:\claude-config, and GitHub; when the user mentions syncing system-level MD files, global CLAUDE.md/AGENTS.md, shared skills, deploying to ~/.claude or ~/.codex, collecting config changes, or publishing agent config changes.
---

# Sync Agent Config

Use this skill for the Claude/Codex configuration repository. Keep one rule clear: `E:\claude-config` is the Git-tracked source, while `~\.claude` and `~\.codex` are runtime deployment targets.

## Scope

Handle these assets:

- Claude global rules: `E:\claude-config\CLAUDE.md` and `C:\Users\fanjiang\.claude\CLAUDE.md`.
- Codex global rules: `E:\claude-config\codex\AGENTS.md` and `C:\Users\fanjiang\.codex\AGENTS.md`.
- Shared skills: `E:\claude-config\skills\<skill>\` and `E:\claude-config\codex\skills\<skill>\`.
- Runtime skills: `C:\Users\fanjiang\.claude\skills\<skill>\` and `C:\Users\fanjiang\.codex\skills\<skill>\`.
- Config memory: `E:\claude-config\memory-hub\` for config-system decisions only.

Do not use this skill for project facts, Inbox整理, Obsidian knowledge notes, or long-term memory curation. Use `memory-bridge` for memory scan/search/migrate/sync.

## Workflow

1. Read context first.
   - Check `E:\claude-config\README.md`.
   - Check `E:\claude-config\memory-hub\MEMORY.md` when the task touches rules, skills, Codex migration, deployment, or GitHub publication.
   - Check Git status in `E:\claude-config` before writing.

2. Decide the authority direction.
   - If the user says a runtime file was already fixed, compare runtime to repo and copy runtime into `E:\claude-config`.
   - If the repo is the intended source, deploy from repo to runtime with the sync scripts.
   - If both sides changed, show the conflict and ask before overwriting either side.

3. Sync both platforms when behavior is shared.
   - Global behavior rules require checking both `CLAUDE.md` and `codex\AGENTS.md`.
   - Shared Skill behavior requires checking both `skills\<skill>\` and `codex\skills\<skill>\`.
   - Codex-only adapter notes may stay only under `codex\skills\<skill>\`.

4. Deploy runtime targets deliberately.
   - Claude: run `.\sync.ps1 status`, then `.\sync.ps1 deploy` when repo-to-runtime deployment is intended.
   - Codex: run `.\codex\sync-codex.ps1 status`, then `.\codex\sync-codex.ps1 deploy` when repo-to-runtime deployment is intended.
   - Manual copying is acceptable for narrow hotfixes, but verify hashes afterward.

5. Validate.
   - Run `git diff --stat` and inspect relevant diffs.
   - For skills, run `quick_validate.py` with UTF-8 enabled on Windows:
     ```powershell
     $env:PYTHONUTF8='1'
     python C:\Users\fanjiang\.codex\skills\.system\skill-creator\scripts\quick_validate.py E:\claude-config\skills\<skill>
     ```
   - Compare SHA256 hashes for files copied across repo/runtime targets.
   - Search semantic anchors such as `memory-bridge`, `CLAUDE.md`, `AGENTS.md`, `claude-config-master`, and `记忆检索硬触发` after rule changes.

6. Publish only after review.
   - Stage only intended files.
   - Commit with a message that names the synced area, for example `sync: update agent memory triggers`.
   - Push to `origin` only after `git status` and `git diff --cached --stat` look right.

## Guardrails

- Never reset, force-push, delete, or overwrite dirty runtime/repo changes without explicit confirmation.
- Do not commit machine-local config, credentials, auth files, histories, caches, daemon state, SQLite state, or `settings.local`.
- Do not turn global system entry files into thin pointers; `CLAUDE.md` and `codex\AGENTS.md` must remain self-contained.
- Do not let old `E:\claude-config-master` references become active routing paths. Historical notes may mention them, active manifests should use `E:\claude-config`.
- Record durable config-system decisions in `E:\claude-config\memory-hub\status\` or `decisions\`; do not write ordinary sync logs as memory.

## Pressure Check

Before finishing, answer yes to all:

- Did I identify whether repo or runtime is the source of truth for this sync?
- Did I check both Claude and Codex sides for shared behavior?
- Did I validate skill frontmatter and copied-file hashes where relevant?
- Did I leave unrelated dirty work untouched?
- If publishing, did I stage only intended files and verify the staged diff?
