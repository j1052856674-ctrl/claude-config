# Universal Agent Memory Index

This is the short index for the Claude/Codex shared memory protocol. Read project-local `memory-hub/MEMORY.md` first for project work; use this index for config-system context.

- memory-spec: Current UAM v2 protocol. Project-local memory is the authority; writes are admission-based; `bridge` defaults to false; details in `MEMORY-SPEC.md`.
- layered-memory-authority: UAM uses project-local memory, agent system adapters, and `E:\个人仓库\03_Knowledge\记忆中枢` as long-term vault; details in `decisions/layered-memory-authority.md`.
- shared-memory-design: Deprecated historical context only; superseded by layered-memory-authority; details in `decisions/shared-memory-design.md`.
- codex-claude-config-migration: Current migration state for adapting Claude config assets to Codex; details in `status/codex-claude-config-migration.md`.
- legacy-claude-memory-import: Existing Claude memory remains an import source until normalized; details in `refs/legacy-claude-memory-import.md`.
- codex-inherits-claude-practice-rules: Codex should inherit proven Claude practice rules as Codex/UAM equivalents; details in `decisions/codex-inherits-claude-practice-rules.md`.
