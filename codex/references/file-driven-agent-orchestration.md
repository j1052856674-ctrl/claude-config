# Codex File-Driven Agent Orchestration Protocol

This reference defines how Codex prompt agents coordinate through files. It is the Codex runtime adapter for Claude-style agent prompts under `codex/prompts/agents/`.

## Goals

- Make every multi-agent run recoverable after context loss or a new conversation.
- Keep child agents isolated: no child-to-child messaging.
- Keep orchestration auditable: every dispatch, output, gate, and blocked item has a file trace.
- Preserve compatibility with Claude-oriented prompt roles while using Codex runtime tools.
- Keep long workflow state out of the noisy main conversation by using a dedicated orchestrator agent as the workflow brain.

## Runtime Mapping

| Claude-style concept | Codex equivalent |
|---|---|
| `Agent` | `spawn_agent` |
| `SendMessage` / resume | `send_input` / `resume_agent` |
| wait for agent | `wait_agent` |
| close completed agent | `close_agent` |
| `AskUserQuestion` | Plain user confirmation; `request_user_input` only when available in Plan mode |
| `Read` / `Glob` / `Grep` | Shell reads/searches or available MCP/resource tools |
| `Write` / `Edit` | `apply_patch` for manual file edits |

Never claim Codex cannot dispatch child agents until the active tool list has been checked. If `spawn_agent` is available, the main session should launch a dedicated orchestrator for long workflows, then execute the orchestrator's file-based dispatch requests.

## Two-Layer Orchestration Model

Codex long workflows use two layers:

| Layer | Role | Responsibilities | Non-responsibilities |
|---|---|---|---|
| L0 main session | transport/controller | Read startup rules, create or recover the run directory, launch/resume the dedicated orchestrator, execute dispatch requests, forward user interruptions, handle tool permissions and final reporting. | Do not hold the long workflow brain or freely rewrite the task system while an orchestrator is active. |
| L1 dedicated orchestrator | workflow brain | Maintain `state.yaml`, `run-log.md`, `blocked-items.md`, `decisions.md`, generate `orchestrator/dispatch.md`, apply gates, update workflow after user constraints or worker results. | Do not implement code/doc deliverables directly. |
| L2 task agents | narrow producers | Produce scoped outputs such as plan, task cards, VC files, code changes, reviews, or verification reports. | Do not maintain global workflow state or message each other directly. |

Codex runtime agent types such as `worker` or `default` are only execution containers. Prompts must declare semantic roles explicitly, for example `Semantic role: orchestrator`.

## Dedicated Orchestrator Trigger

The main session should start or resume a dedicated orchestrator when the task involves any of the following:

- multi-agent coordination;
- file-driven run directories;
- PRD/plan/implementation/review/verification workflows;
- batch processing or parallel execution;
- three or more workflow stages;
- long tasks likely to receive user interruptions.

Very small single-step edits may stay in the main session. If the user explicitly asks to keep the workflow in the main chat, follow the user while still writing recoverable run files for non-trivial work.

## Controller Checklist

Before the main session launches or resumes any long workflow, it should answer yes to all of the following:

- Did I decide whether this task requires a dedicated orchestrator under the trigger rules?
- Did I create or recover the run directory before dispatching child work?
- Did I launch or resume the dedicated orchestrator before inventing my own downstream batch plan?
- Did I wait for `orchestrator/heartbeat.md` within the first signal window?
- Did I execute the current `orchestrator/dispatch.md` rather than improvise a parallel workflow?
- After a child batch completed, did I send the result back to the orchestrator before deciding the next batch?
- If the user interrupted, did I forward that constraint to the orchestrator instead of silently rewriting the workflow myself?

If any answer is no, the main session should pause, record the gap in `run-log.md`, and correct the orchestration state before continuing.

## Run Directory

Every multi-agent run should use one run directory:

```text
08_Reports/runs/{run-id}/
  state.yaml
  run-log.md
  blocked-items.md
  decisions.md
  run-summary.md
  orchestrator/
    heartbeat.md
    progress.md
    dispatch.md
    status.md
    controller-action.md
    controller-result.md
  tasks/
    T01-{slug}/
      heartbeat.md
      progress.md
      prompt.md
      task-card.md
      context-card.md
      vc.md
      output.md
      result-summary.md
      review.md
      verify.md
```

For legacy or very small runs, flat files directly under `08_Reports/` are acceptable only as historical artifacts. New runs should use `runs/{run-id}/`.

## File Roles

| File | Owner | Purpose |
|---|---|---|
| `state.yaml` | orchestrator/controller | Single source of truth for workflow, task status, agent IDs, dependencies, and artifact paths. |
| `run-log.md` | orchestrator/controller | Human-readable audit trail of decisions, dispatches, outputs, deviations, and final diagnosis. |
| `blocked-items.md` | orchestrator/controller | Auto-mode degradation and unresolved human decisions. |
| `decisions.md` | orchestrator/controller | Durable decisions made during the run, separate from verbose logs. |
| `run-summary.md` | dedicated orchestrator | Final compact run overview: completed scope, changed files, verification, residual risks, and next recommendations. |
| `orchestrator/heartbeat.md` | dedicated orchestrator | Early liveness signal for the workflow brain. |
| `orchestrator/progress.md` | dedicated orchestrator | Stage progress before the next dispatch is ready. |
| `orchestrator/dispatch.md` | dedicated orchestrator | Full dispatch request and audit detail for the next batch. |
| `orchestrator/status.md` | dedicated orchestrator | Compact controller-facing state: whether the main session should act now, wait, or stop. |
| `orchestrator/controller-action.md` | dedicated orchestrator | Lean controller-facing action file with only the next executable action. |
| `orchestrator/controller-result.md` | main session | Lean result handoff from the main session back to the orchestrator after a batch. |
| `heartbeat.md` | child agent | Early liveness signal: confirms the child agent started, understood scope, and names intended output paths. |
| `progress.md` | child agent | Stage progress for medium/large tasks, especially before final output exists. |
| `prompt.md` | orchestrator | Complete child-agent prompt; the main session passes only this path plus a short execute instruction. |
| `task-card.md` | orchestrator/planner | The exact task contract for a child agent. |
| `context-card.md` | orchestrator/controller | Project context, rules, file pointers, constraints, and handoff notes. |
| `vc.md` | planner/orchestrator | Validation Contract assertions for the task. |
| `output.md` | worker agent | The child agent's final deliverable summary or report. |
| `result-summary.md` | child agent | Short completion summary and verification evidence pointer for controller handoff. |
| `review.md` | reviewer | Independent review result. |
| `verify.md` | contract-validator | VC pass/fail report. |

## Communication Rules

1. Child agents do not message each other directly.
2. Child agents only read their `context-card.md`, `task-card.md`, `vc.md`, and explicitly listed file pointers.
3. Child agents write only their assigned output files, unless the task explicitly grants a code/doc write scope.
4. Dedicated orchestrator is the normal owner of `state.yaml` and `run-log.md`; the main session may append transport events, user interruptions, and tool execution results.
5. Handoffs use file paths, not large pasted content.
6. Resume must read `state.yaml` first and reuse existing `agent_id` when possible.
7. A task that lacks a clear VC must not enter `dev_loop` or `batch_process`.
8. The main session should execute `orchestrator/dispatch.md` rather than inventing a parallel workflow while an orchestrator is active.

## Dispatch Request Format

`orchestrator/dispatch.md` should be small, current, and executable by the main session. It should include:

```markdown
# Dispatch Request

## Batch
- id: Dxx
- purpose: why this batch exists
- depends_on: paths or task ids

## Agents To Spawn Or Resume
| task_id | semantic_role | runtime_role | authority_skill | optional_supporting_skills | task_dir | prompt_source | expected_first_file | first_signal_s | total_wait_s |
|---|---|---|---|---|---|---|---|---:|---:|

## Required Controller Actions
1. Concrete spawn/resume/wait/close actions for the main session.
2. Context-card or task-card paths to include in prompts.

## Acceptance Check
- Files to check when the batch completes.
- Escalation choice: resume, retry smaller, degrade, or ask user.
```

Do not store the only copy of a dispatch decision in chat. If the user interrupts with new constraints, the main session forwards them to the dedicated orchestrator and the orchestrator updates this file.

## Lean Controller Action

To keep the main conversation lightweight, the dedicated orchestrator should write `orchestrator/controller-action.md` for every executable batch. This is the main session's normal read target; `dispatch.md` remains the fuller audit and recovery artifact.

Suggested format:

```markdown
# Controller Action

- batch_id: Dxx
- action: spawn | resume | wait | stop
- task_id: Txx
- semantic_role: worker-code | planner | validator | orchestrator
- runtime_role: worker | default
- agent_id: none | existing-agent-id
- user_visible_action: spawn_new_worker | resume_existing_orchestrator | resume_existing_worker | wait_existing_agent | stop
- scope_digest: one-line task boundary for the main session to show/read
- risk_level: low | medium | high
- requires_memory_write: true | false
- expected_changed_paths: path globs or none
- task_dir: 08_Reports/runs/{run-id}/tasks/Txx-{slug}
- prompt_file: 08_Reports/runs/{run-id}/tasks/Txx-{slug}/prompt.md
- first_signal_file: 08_Reports/runs/{run-id}/tasks/Txx-{slug}/heartbeat.md
- first_signal_s: 60
- total_wait_s: 120 | 300 | 600
- result_summary_file: 08_Reports/runs/{run-id}/tasks/Txx-{slug}/result-summary.md
- fallback: read heartbeat on timeout; otherwise send result-summary path back to orchestrator
- terminal_state: none | completed | blocked | human_required | paused
- updated_at: 2026-06-30T00:00:00+08:00
```

Rules:

- Normal controller path reads `status.md` and `controller-action.md`, not the full `dispatch.md`.
- The main session reads full `dispatch.md` only when the action file is missing, contradictory, stale, or needed for audit/debugging.
- The orchestrator writes `tasks/Txx/prompt.md` for each child task. The main session spawns with a short prompt: `Read this prompt file and execute it exactly: <prompt_file>`.
- `prompt.md` must be self-contained enough for the child agent: the first 200 tokens include Semantic role, project Context Card, authority_skill, task directory, write scope, and prohibitions.
- Child agents must write `heartbeat.md` first, then read `task-card.md`, `context-card.md`, `vc.md`, and listed source files.
- Child prompts must require both `output.md` and `result-summary.md`, including exact verification commands, observed results, exit codes or key output. If verification was not run, the child must write `not_run` with the reason.
- If a task changes user-visible behavior, CLI usage, sample projects, reports, README, configuration, or operating workflow, the child output must include `How To Use` or `Fan Manual Verification` steps that the user can run locally.
- If a task changes durable project facts, architecture, rules, validation status, or startup context, the prompt must require Context Surface Sync: update the relevant `README.md`, `AGENTS.md`, `memory-hub/MEMORY.md`, `memory-hub/architecture/`, `memory-hub/status/`, `memory-hub/reviews/`, and run-level reports.
- Small tasks use one normal `wait_agent` of 120 seconds; medium tasks use one normal wait of 300 seconds. Read `heartbeat.md` / `progress.md` only on timeout or visible inconsistency.
- If `total_wait_s` is greater than 300, the child prompt must require `progress.md` after the first meaningful stage or before the 300 second mark, whichever comes first.
- `user_visible_action` must distinguish a newly spawned worker from a resumed orchestrator/worker so the main session can tell the user whether a new background agent should appear.
- On completion, the main session sends back `result-summary.md` path. If absent, read only the first 80-120 lines of `output.md` and ask the orchestrator to require a summary next time.

## Controller Result Template

The main session should overwrite `orchestrator/controller-result.md` after each executed controller action. Keep it short and parseable:

```markdown
# Controller Result

- batch_id: Dxx
- task_id: Txx
- action_result: completed | failed | timed_out | blocked | skipped
- agent_id: agent-id-or-none
- result_summary_file: path-or-none
- output_file: path-or-none
- verification:
  - command: exact command
    result: short observed result
- fan_manual_verification: path-or-none
- changed_files:
  - path
- scope_check: one-line confirmation or violation
- next_expected_owner: orchestrator | controller | user
- blocker: none | short blocker
```

Rules:

- `controller-result.md` is the normal handoff back to the dedicated orchestrator.
- Do not paste full child output into the main conversation when `result-summary.md` exists.
- If verification was not run, state `not_run` with the reason. Never mark unrun verification as passed.
- If scope drift is detected, set `action_result: blocked` or `failed` and return control to the orchestrator for a correction batch.

## Run Summary

When `terminal_state` becomes `completed`, `blocked`, `human_required`, or `paused`, the dedicated orchestrator must write or update `run-summary.md` before the main session gives the final user report.

Suggested sections:

```markdown
# Run Summary

## Terminal State
- state:
- reason:

## Completed Scope
- batch/task list:

## Changed Files
- path:

## Verification
- command:
- result:

## How To Use / Fan Manual Verification
- step:
- expected result:

## Residual Risks
- item:

## Next Recommendations
- item:
```

The main session can then summarize from `status.md`, `controller-action.md`, and `run-summary.md` without reading every child artifact.

If the Chinese run closure files were generated before the dedicated orchestrator wrote the final terminal state, the orchestrator must refresh them after writing the terminal state. `00-运行总览.md`, `01-验证与证据.md`, and `02-人工复验指南.md` must match `orchestrator/status.md` and `run-summary.md`; stale text such as "waiting for orchestrator review" or `terminal_state: none` is a closure defect.

## Delivery Evidence Contract

Every executable child task must leave enough evidence for a user or future agent to understand completion without chat history:

- `output.md`: detailed scope, changed files, verification commands, observed results, unverified items, and residual risks.
- `result-summary.md`: short controller handoff with verdict, changed files, verification status, scope check, and blocker.
- `How To Use` / `Fan Manual Verification`: required when user-visible behavior, CLI usage, samples, reports, configuration, or workflows change.
- Run Closure: before terminal state, use the `run-closure` Skill or dispatch a task with `authority_skill: run-closure`; it must generate Chinese `00-运行总览.md`, `01-验证与证据.md`, and `02-人工复验指南.md`.
- Verification report: when the run delivers a runnable tool, CLI, sample, report, automation, or user workflow, evidence should be written to `01-验证与证据.md`; if a legacy `functional-test-report.md` is also kept, the Chinese entry files must point to it.
- Context Surface Sync: required when durable project facts change. Update the appropriate README, AGENTS, `memory-hub/MEMORY.md`, detailed memory files, and run reports.
- Never report unrun verification as passed. Use `not_run` plus reason and residual risk.

## Run Closure Gate

The controller loop may stop only after the dedicated orchestrator has completed run closure. A completed run must have:

```text
08_Reports/runs/{run-id}/
  00-运行总览.md
  01-验证与证据.md
  02-人工复验指南.md
```

Rules:

- The dedicated orchestrator should dispatch run closure as the final batch when a workflow is otherwise ready for terminal state.
- The closure task should bind `authority_skill: run-closure`.
- `00-运行总览.md` is the fan-facing first page.
- `01-验证与证据.md` is the verification/evidence page. Use `not_run` with reason and residual risk when no automated verification applies.
- `02-人工复验指南.md` tells fan how to inspect or rerun the result locally.
- If the run changes durable project facts, closure must update the appropriate `memory-hub` file and `memory-hub/MEMORY.md`.
- After final terminal state is written, the dedicated orchestrator must verify that the Chinese closure files reflect that final state. If they still describe a pre-terminal waiting state, dispatch a correction or update the closure files inside the run directory before stopping.
- If closure cannot be completed, terminal state should be `blocked` or `human_required`, not `completed`.

## Skill Binding Rule

When a task clearly falls under an existing capability domain with a registered authority Skill, that Skill must be bound explicitly in planning and dispatch artifacts. "Could use a generic worker prompt" is not a valid reason to skip the authority Skill.

Rules:

- If the capability matrix already names an authority Skill for the task, `authority_skill` is required in `dispatch.md`.
- If no suitable Skill exists, `authority_skill: none` is acceptable, but the orchestrator should state why no existing Skill fits.
- Supporting or optional Skills may be listed in `optional_supporting_skills`, but they do not replace the authority Skill.
- The main session should treat missing required skill binding as an orchestration gap and send the batch back for correction before dispatch when practical.

## Orchestrator Status File

`orchestrator/status.md` is the smallest controller-facing state file. It should be updated whenever the orchestrator changes phase, issues a new batch, or reaches a terminal state.

Suggested format:

```markdown
# Orchestrator Status

- run_id: docops-cli-v0.1-implementation-20260626
- phase: planning_next_batch | waiting_controller | waiting_child | blocked | completed | paused | human_required
- current_batch: D02
- controller_action_required: true | false
- next_action: spawn vc-writer | wait T03 heartbeat | ask user | none
- terminal_state: none | completed | blocked | human_required | paused
- blocking_reason: none | short explanation
- updated_at: 2026-06-26T18:20:00+08:00
```

Rules:

- `controller_action_required: true` means the main session should do something now.
- `waiting_child` means the main session should wait on already-dispatched child work, not invent a new batch.
- `planning_next_batch` means the main session should wait for the orchestrator to finish updating `dispatch.md`/`status.md`.
- `terminal_state != none` means the loop should stop and surface the status to the user.

## Controller Event Loop

When a dedicated orchestrator is active, the main session should follow this loop:

1. Read `orchestrator/status.md` and `orchestrator/controller-action.md`; read `dispatch.md` only for recovery or audit.
2. If `terminal_state != none`, stop the loop and report the state.
3. If `controller_action_required: true`, execute the current controller action.
4. Wait for child-agent observability and outputs using the batch wait policy.
5. Send the batch result path or `controller-result.md` back to the dedicated orchestrator.
6. Wait for the orchestrator to update `status.md` and, if needed, `controller-action.md` / `dispatch.md`.
7. Repeat until a terminal state is reached.

The main session should not stop merely because one child batch completed. Completion of a child batch is only a mid-loop event unless the orchestrator marks the run terminal.

## Terminal States

The controller loop stops only when the orchestrator writes one of these terminal states:

- `completed`: the run reached its intended stopping point;
- `blocked`: the workflow cannot continue without a major correction or a new plan;
- `human_required`: the orchestrator needs a user decision before any safe next batch exists;
- `paused`: the user explicitly paused or archived the run.

If none of these states is present, the main session should assume the workflow is still live and continue following the controller loop.

## Dedicated Orchestrator Observability

The dedicated orchestrator must itself provide early signals:

- `orchestrator/heartbeat.md` within 60 seconds;
- `orchestrator/dispatch.md`, `orchestrator/progress.md`, or a draft within 3 minutes for medium workflows;
- updated dispatch after each completed batch or forwarded user constraint.
- `run-summary.md` before any terminal final report.

If no orchestrator heartbeat appears within the first signal window, treat it as a startup/tool/prompt issue. If heartbeat exists but dispatch is missing, prefer `send_input`/`resume_agent` with a focused correction before closing.

## Protocol Violations

The following are protocol violations and should be corrected before the workflow proceeds:

1. The main session dispatches a new batch while an active dedicated orchestrator has not yet updated `orchestrator/dispatch.md` for that batch.
2. The main session uses child-agent results to decide D02/D03 itself without sending the results back to the dedicated orchestrator.
3. A dedicated orchestrator starts broad coordination without first writing `orchestrator/heartbeat.md`.
4. A dedicated orchestrator keeps the only copy of the next-step decision in chat rather than in `orchestrator/dispatch.md`.
5. A dedicated orchestrator changes phase or reaches a terminal condition but does not update `orchestrator/status.md`.
6. A child task enters implementation or batch execution without a clear task file contract and, where required, a VC.
7. A controller or child agent rewrites `state.yaml` or `run-log.md` in ways that erase prior run facts rather than appending or normalizing them.
8. A user interruption changes scope or priority, but the new constraint is not forwarded back to the dedicated orchestrator.
9. The main session stops after a child batch completes even though the orchestrator has not written a terminal state.
10. A task clearly matches an authority Skill in the capability matrix, but the orchestrator dispatches it without `authority_skill` binding and without explaining why no Skill fits.
11. The orchestrator writes a terminal state while the fan-facing closure files still describe an older non-terminal state.

Recommended response to a violation:

- stop the next batch;
- write or append the missing orchestration file;
- resume or correct the dedicated orchestrator;
- only then continue dispatch.

## Observability And Wait Policy

Child agents must be observable before they produce final output. Do not design tasks where the controller can only wait blindly for `output.md`.

### Required Heartbeat

For any non-trivial child task, the first write should be `heartbeat.md` in the task directory. It should contain:

- agent role and received task id;
- files it plans to read;
- files it plans to write;
- first-stage plan;
- any immediate blocker.

Very small direct-write tasks may skip `heartbeat.md` only when the expected final output is a single small file and should appear within 60 seconds.

### Progress Files

Medium or large tasks must write `progress.md` before final output if they need more than one stage. Examples:

- planner writing a large plan;
- task splitter creating multiple task directories;
- worker touching multiple files;
- reviewer checking several outputs.

### Wait Windows

Use condition-based waiting, not only one long `wait_agent` call:

| Task shape | First observable file | Expected first signal | Total wait before escalation |
|---|---|---:|---:|
| Small single-file write | `output.md` | 60s | 120s |
| Medium planning/review | `heartbeat.md`, then `progress.md` or draft output | 60s heartbeat, 3m progress | 8-12m |
| Multi-file generation | `heartbeat.md`, manifest/progress, then batches | 60s heartbeat, 3m manifest | 12-20m with progress |

If `heartbeat.md` exists but final output is missing, prefer `send_input`/`resume_agent` with a focused correction before closing the agent. If no heartbeat or output appears within the first signal window, treat it as a start/tool/prompt issue and consider closing or retrying with a smaller task.

### Task Granularity Limits

Do not ask one child agent to perform broad orchestration and multi-file generation in one step. In particular, avoid prompts that ask a planner to simultaneously:

- read many context files;
- generate `plan.md`;
- create 4+ task directories;
- write every `task-card.md`, `context-card.md`, and `vc.md`.

Split that into smaller roles:

```text
planner -> writes heartbeat.md and plan.md only
task-splitter -> reads plan.md and creates task-card/context-card files
vc-writer -> reads plan.md/task-card files and creates vc.md files
contract-validator -> validates final plan/task/vc outputs
```

The controller may coordinate these roles through `spawn_agent`, but the handoff between roles must remain file-driven.

## Context Card Minimum

Each child agent prompt must include, or point to a file containing:

```text
## Project Context
- 项目：{name}（{type}）
- 阶段：{phase}
- 架构图：{path or none}
- 相关决策/踩坑：[{paths or short bullets}]

## Task
{specific task}

## File Pointers
- {path}: {why it matters}

## Constraints
- write scope
- forbidden actions
- auto_mode
```

## Validation Contracts

Use a VC even for analysis tasks, scaled to risk:

- Analysis VC: objective, scope, output format, evidence expectations, uncertainty requirements.
- Implementation VC: normal, boundary, and error assertions with objective pass/fail criteria.
- Review VC: expected review dimensions and severity rules.

The contract-validator should read only the VC and final output unless explicitly running a precheck.

## Quality Gates

Before marking a task complete, orchestrator/controller checks:

- Scope: child stayed within assigned role and write scope.
- Evidence: claims cite project files, command output, or clearly labeled general engineering facts.
- Contract: output satisfies the task VC.
- Isolation: child did not depend on hidden conversation context or another child agent's private state.
- Audit: output declares file modifications, trial-repo scans, and sensitive-data handling.

## Directory Assessment Rule

A run directory is compliant when:

- It has `state.yaml` and `run-log.md`.
- Each child task has its own directory under `tasks/`.
- Task input and output are file-addressable.
- The state file can tell a new session what to resume next.
- No required handoff exists only in chat history.
