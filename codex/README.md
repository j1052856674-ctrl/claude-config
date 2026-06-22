# Codex Adapter Assets

This directory contains Codex-specific adapters derived from the Claude configuration repository.

## Purpose

- Keep Claude-native assets in the repository root (`CLAUDE.md`, `skills/`, `agents/`, `commands/`).
- Keep Codex-specific adapted assets under `codex/`.
- Keep UAM protocol, migration status, and config-system decisions in repository `memory-hub/`; project facts stay in each project's local `memory-hub/`, and long-term reusable knowledge is curated into `E:\个人仓库\03_Knowledge\记忆中枢\`.

## Layout

- `AGENTS.md`: Codex global rules source.
- `skills/`: Codex-adapted skills.
- `prompts/agents/`: prompt templates converted from Claude agent definitions.
- `workflows/`: Codex workflow documents converted from Claude commands.
- `references/`: Codex-specific reference material.
- `sync-codex.sh`: deploy/status script for Codex assets.
- `sync-codex.example.json`: machine-local sync config template.

## Deployment Principle

Treat this directory as a staging and installation source. Review changes here before deploying to `~/.codex`.

## Maintenance Notes

- Root `skills/` is the Claude source; `codex/skills/` is the Codex adapter source.
- For shared skill behavior, keep both sides semantically aligned. Codex-only notes may stay under `codex/skills/`.
- Global memory protocol is not duplicated here; both Claude and Codex reference repository root `memory-hub/`.
- After changing shared rules, check both `CLAUDE.md` and `codex/AGENTS.md`.
- Deploy to Codex with `.\codex\sync-codex.ps1 deploy` on PowerShell or `bash codex/sync-codex.sh deploy` in bash.
