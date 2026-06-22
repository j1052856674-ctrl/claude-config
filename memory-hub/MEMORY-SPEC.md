# Universal Agent Memory Spec v2.0

Universal Agent Memory (UAM) is a layered memory protocol shared by Claude, Codex, and future agents. It separates project-local facts, tool-specific adapters, and curated long-term human knowledge.

## Authority Model

1. **Project local memory**: `<project>/memory-hub/`
   - Authority for project-specific status, plans, decisions, lessons, reviews, and architecture maps.
   - Created per project when durable project context appears.
   - Read before global long-term memory for project work.

2. **Agent system adapters**: `~/.claude/` and `~/.codex/`
   - Tool-specific runtime roots for Claude and Codex.
   - May contain rules, skills, caches, sessions, or local memory stores.
   - Are installation/cache/import targets, not the final authority for project facts.

3. **Long-term knowledge vault**: `E:\个人仓库\03_Knowledge\记忆中枢\`
   - Authority for reusable, cross-project, long-term knowledge.
   - Receives curated entries from project `memory-hub/` records through memory bridge.
   - Must stay human-readable, desensitized, and Obsidian-friendly.

`E:\claude-config\memory-hub\` is the shared protocol and config-repo operational index. It stores UAM rules, migration status, routing manifests, and config-level decisions. It is not a dumping ground for project facts.

## Read Protocol

Read in layers to conserve tokens:

1. Read the local project rule file first (`AGENTS.md`, `CLAUDE.md`, or equivalent).
2. If `<project>/memory-hub/MEMORY.md` exists, read it as the project short index.
3. If the task needs tool/config migration context, read `E:\claude-config\memory-hub\MEMORY.md`.
4. If the task needs reusable long-term knowledge, search or read the relevant section under `E:\个人仓库\03_Knowledge\记忆中枢\`.
5. Open only relevant detail files. Do not load all memory directories by default.

## Hot / Warm / Cold Layers

| Layer | Location | Purpose | Default read |
|---|---|---|---|
| Hot | `MEMORY.md` | Startup index with active pointers only | Yes |
| Warm | `arch/`, `status/`, `decisions/`, `lessons/`, `reviews/`, `refs/`, `conflicts/` | Task-specific detail assets | No |
| Cold | `_archive/` | Deprecated, superseded, or low-frequency history | No |

## Write Admission

Write memory only when the information is durable enough to affect future work.

Must write:

- Irreversible or high-cost decisions, such as architecture boundaries, authority sources, object grain, or capability ownership.
- Repeated mistakes or high rework-risk lessons.
- Current blockers, phase transitions, or confirmed business/technical definitions.
- Rules that directly affect future agent routing, skill invocation, validation, or registry/build behavior.

May write, but do not add to `MEMORY.md` by default:

- Ordinary review reports.
- One-off approach comparisons.
- Stage snapshots.
- Tool run records and validation summaries.

Do not write:

- Git/file-change流水、temporary command output, or raw transcripts.
- Unaccepted ideas, speculation, or brainstorming residue.
- Directory/function/config lists that can be read directly from source files.
- Credentials, tokens, private keys, personal private data, local runtime state, histories, daemon state, caches, SQLite state, or `settings.local`.

## Write Protocol

Choose the target by scope:

1. **Project-specific facts** go to `<project>/memory-hub/`.
2. **Reusable cross-project lessons or methods** first get written locally only when they pass admission, then may be marked `bridge: true`.
3. **Config system decisions** for Claude/Codex migration go to `E:\claude-config\memory-hub/`.
4. **Tool runtime state** stays in `~/.claude/` or `~/.codex/` and must not be promoted unless it becomes durable knowledge.

Before writing memory:

1. Search the relevant local/global index for the same topic.
2. Update existing memory when possible instead of creating fragments.
3. If a new fact conflicts with an active memory, create or update a conflict record instead of silently overwriting.
4. Keep detail files concise. Prefer conclusions, constraints, and pointers over transcripts.
5. Update `MEMORY.md` only for hot active pointers; ordinary warm records do not need startup-index entries.

## Project Memory Directory Model

A project `memory-hub/` should use:

- `MEMORY.md`: project short index.
- `MEMORY-SPEC.md`: project-specific memory rules when needed.
- `decisions/`: project decisions, policies, architecture choices.
- `lessons/`: repeated mistakes, fixes, feedback, operational lessons.
- `status/`: project status, plans, milestones.
- `refs/`: external references and tool notes.
- `reviews/`: review reports and durable review findings.
- `conflicts/`: unresolved memory conflicts.
- `_archive/`: deprecated or retired memory.
- `manifests/`: machine-readable indexes and source maps, when useful.

Do not scatter detail records in the root. Root should normally contain only `MEMORY.md`, `MEMORY-SPEC.md`, and exceptional legacy entry points.

## `MEMORY.md` Rules

- Keep project `MEMORY.md` short enough for startup; recommended maximum is 20 entries.
- Prefer one category/entry pointer over listing every historical asset.
- New review reports do not enter `MEMORY.md` by default.
- Superseded, archived, resolved, or stale records should not remain hot-index entries.
- If `MEMORY.md` exceeds the limit, move low-value entries to warm directories or `_archive/`.

## Frontmatter

Every UAM detail file should start with YAML frontmatter:

```yaml
---
id: mem-YYYYMMDD-short-name
title: Human readable title
type: decision | lesson | status | ref | review | conflict | governance
scope: project | global | skill | tool
status: active | draft | deprecated | conflict | archived
source: human | claude | codex | import | mixed
agents: [claude, codex]
created: YYYY-MM-DD
updated: YYYY-MM-DD
bridge: false
supersedes: []
conflicts_with: []
completeness: complete | partial | stale
confidence: high | medium | low
needs_review: false
token_policy: index-only | selective-read | full-read-on-demand
---
```

Minimal project files may use a smaller frontmatter, but must include `name` or `id`, `type`, `created`, and explicit `bridge`.

## Bridge Rules

- `bridge: false` is the default.
- Missing `bridge` must be treated as `false` for new records.
- `bridge: true` means the record may be considered for long-term vault curation; it does not mean automatic promotion.
- Set `bridge: true` only when all conditions hold:
  1. The record is abstracted into a reusable method, principle, or anti-pattern.
  2. It does not depend on project-private table names, paths, credentials, or local state to be useful.
  3. It has clear expected value for future projects.
- Project status, ordinary reviews, one-off snapshots, path fixes, and tool run logs default to `bridge: false`.
- Memory bridge must show candidates and ask for confirmation before writing into `E:\个人仓库\03_Knowledge\记忆中枢\` unless the user explicitly enables automatic mode.
- Long-term vault writes must be deduplicated, desensitized, and generalized.

## Review and Snapshot Rules

- L1/light review: prefer conversation output; do not write memory unless the user asks or P0/P1 durable risk is found.
- L2/L3/deep review: write to `reviews/`, default `bridge: false`.
- Repeated review of the same target: update the existing report or use `supersedes`; avoid date-based流水.
- `task-snapshot` defaults to text output only. It writes memory only for phase transition, irreversible decision, repeated lesson, authority-source change, or explicit user request.
- Snapshot method insights are candidate deposits, not automatic new memory files.

## Conflict Rules

- `status: conflict` means agents may cite the conflict but must not treat either side as fully authoritative.
- `supersedes` means the new memory replaces older memory for the same topic.
- `conflicts_with` means both records exist and require review.
- A conflict is resolved only when the replacement memory names what it supersedes and why.

## Archive Rules

Archive instead of deleting when historical trace may still matter:

- Decisions superseded by newer decisions.
- Reviews that are complete and no longer drive current work.
- Old phase status records.
- Legacy templates or rules that conflict with the active model.

Place archived records under `_archive/` or mark `status: archived` with a clear `superseded_by` pointer.

## Compatibility

Claude and Codex clients must point to this layered model:

- Claude adapter: `~/.claude/CLAUDE.md` and repo `CLAUDE.md`.
- Codex adapter: `~/.codex/AGENTS.md` and repo `codex/AGENTS.md`.
- Project adapters: project `AGENTS.md` / `CLAUDE.md` should prefer local `memory-hub/` and bridge only curated durable knowledge upward.
