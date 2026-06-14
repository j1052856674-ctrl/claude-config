# Universal Agent Memory Spec v1.1

Universal Agent Memory (UAM) is a layered memory protocol shared by Claude, Codex, and future agents. It separates project-local facts, tool-specific adapters, and long-term human knowledge.

## Three-Layer Authority Model

1. **Project local memory**: `<project>/memory-hub/`
   - Authority for project-specific status, plans, decisions, lessons, reviews, and architecture maps.
   - Created per project when durable project context appears.
   - Read before global long-term memory for project work.

2. **Agent system adapters**: `~/.claude/` and `~/.codex/`
   - Tool-specific runtime roots for Claude and Codex.
   - May contain rules, skills, caches, sessions, or local memory stores.
   - Not the final authority for cross-project long-term knowledge.

3. **Long-term knowledge vault**: `E:\个人仓库\03_Knowledge\记忆中枢\`
   - Authority for reusable, cross-project, long-term knowledge.
   - Receives curated entries from project `memory-hub/` records through memory bridge.
   - Should stay human-readable and Obsidian-friendly.

`E:\claude-config-master\memory-hub\` is the shared protocol and config-repo operational index. It stores UAM rules, migration status, routing manifests, and config-level decisions. It is not a dumping ground for every project fact.

## Read Protocol

Read in layers to conserve tokens:

1. Read the local project rule file first (`AGENTS.md`, `CLAUDE.md`, or equivalent).
2. If `<project>/memory-hub/MEMORY.md` exists, read it as the project short index.
3. If the task needs tool/config migration context, read `E:\claude-config-master\memory-hub\MEMORY.md`.
4. If the task needs reusable long-term knowledge, search or read the relevant section under `E:\个人仓库\03_Knowledge\记忆中枢\`.
5. Use manifests or indexes to open only relevant detail files. Do not load all memory directories by default.

## Write Protocol

Choose the target by scope:

1. **Project-specific facts** go to `<project>/memory-hub/`.
2. **Reusable cross-project lessons or methods** first get written locally with `bridge: true`, then memory bridge curates them into `E:\个人仓库\03_Knowledge\记忆中枢\`.
3. **Config system decisions** for Claude/Codex migration go to `E:\claude-config-master\memory-hub/`.
4. **Tool runtime state** stays in `~/.claude/` or `~/.codex/` and must not be promoted unless it becomes durable knowledge.

Before writing memory:

1. Search the relevant local/global index for the same topic.
2. Update existing memory when possible instead of creating fragments.
3. If a new fact conflicts with an active memory, create or update a conflict record instead of silently overwriting.
4. Keep detail files concise. Prefer conclusions, constraints, and pointers over transcripts.
5. Update the applicable `MEMORY.md` and manifest/index after adding or changing active memory.

## Project Memory Directory Model

A project `memory-hub/` should use:

- `MEMORY.md`: project short index.
- `decisions/`: project decisions, policies, architecture choices.
- `lessons/`: repeated mistakes, fixes, feedback, operational lessons.
- `status/`: project status, plans, milestones.
- `refs/`: external references and tool notes.
- `reviews/`: review reports and durable review findings.
- `conflicts/`: unresolved memory conflicts.
- `_archive/`: deprecated or retired memory.
- `manifests/`: machine-readable indexes and source maps.

## Long-Term Vault Model

The long-term vault is `E:\个人仓库\03_Knowledge\记忆中枢\`.

Recommended categories:

- `AI与编程/`: reusable AI/coding/tooling lessons.
- `Skill设计/`: skill, agent, prompt, workflow design knowledge.
- `项目经验/` or existing project-experience areas: curated project-derived methods.
- Additional categories may follow the vault's existing Obsidian structure.

Memory bridge should deduplicate, generalize, desensitize, and route project memories into this vault. It should not blindly copy every project record.

## Frontmatter

Every UAM detail file should start with YAML frontmatter:

```yaml
---
id: mem-YYYYMMDD-short-name
title: Human readable title
type: decision | lesson | status | ref | review | conflict
scope: project | global | skill | tool
status: active | draft | deprecated | conflict
source: human | claude | codex | import | mixed
agents: [claude, codex]
created: YYYY-MM-DD
updated: YYYY-MM-DD
bridge: true
supersedes: []
conflicts_with: []
completeness: complete | partial | stale
confidence: high | medium | low
needs_review: false
token_policy: index-only | selective-read | full-read-on-demand
---
```

## Bridge Rules

- `bridge: true` means the record may be considered for long-term vault curation.
- `bridge: false` means keep it local.
- Missing `bridge` defaults to `true` only for project memory records created under UAM.
- Memory bridge must show candidates and ask for confirmation before writing into `E:\个人仓库\03_Knowledge\记忆中枢\` unless the user explicitly enables an automatic mode.
- Long-term vault writes must be desensitized and generalized.

## Conflict Rules

- `status: conflict` means agents may cite the conflict but must not treat either side as fully authoritative.
- `supersedes` means the new memory replaces older memory for the same topic.
- `conflicts_with` means both records exist and require review.
- A conflict is resolved only when the replacement memory names what it supersedes and why.

## Token Budget Rules

- Read short indexes first.
- Use manifests and exact paths for detail reads.
- Avoid full memory tree loading.
- Keep project indexes short enough for quick startup.
- Long-term vault entries should summarize principles and link back to source project memory when useful.

## Compatibility

Claude and Codex clients must point to this layered model:

- Claude adapter: `~/.claude/CLAUDE.md` and repo `CLAUDE.md`.
- Codex adapter: `~/.codex/AGENTS.md` and repo `codex/AGENTS.md`.
- Project adapters: project `AGENTS.md` / `CLAUDE.md` should prefer local `memory-hub/` and bridge durable knowledge upward.
