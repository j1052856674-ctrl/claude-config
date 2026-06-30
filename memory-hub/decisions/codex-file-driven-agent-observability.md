---
title: "Codex 文件驱动子代理可观测性规则"
status: active
scope: config-system
kind: decision
created: "2026-06-26"
updated: "2026-06-30"
---

# Codex 文件驱动子代理可观测性与独立编排规则

## 背景

DocOps Lifecycle 项目中复跑 Codex 文件驱动多 Agent 编排时，极小写文件任务可以由子代理直接完成；但一次性要求 planner 读取多个上下文文件、生成完整计划、创建多个任务目录并写入全部任务卡和 VC 时，子代理长时间无产物，父会话只能关闭并记录 blocked。

后续复盘发现，若完全由主会话长期持有 workflow brain，主对话会持续接收用户打断、系统上下文和临时问题，容易污染长流程状态。因此 Codex 长流程需要 dedicated orchestrator 子代理隔离 workflow 思考，但该 orchestrator 必须通过文件暴露心跳、状态和 dispatch，不能成为不可观测后台黑盒。

## 决策

Codex 多 Agent 编排采用双层编排 + 可观测小任务协议：

- 主会话是 L0 transport/controller：启动或恢复 dedicated orchestrator，执行 dispatch，转发用户新约束，处理工具权限和最终汇报。
- dedicated orchestrator 是 L1 workflow brain：维护 `state.yaml`、`run-log.md`、`blocked-items.md`、`decisions.md` 和 `orchestrator/dispatch.md`，负责拆分任务、质量门和降级策略。
- worker/planner/reviewer/validator 是 L2 窄任务执行者：只产出自己的文件，不维护全局状态。
- 长流程、多 Agent、文件驱动 run、三阶段以上工作优先启动 dedicated orchestrator；主会话不长期自行持有 workflow brain。
- Codex runtime 的 `worker` / `default` 只是执行容器，prompt 必须显式声明 `Semantic role: orchestrator|planner|...`。
- dedicated orchestrator 启动后必须先写 `orchestrator/heartbeat.md`，随后写 `orchestrator/dispatch.md` 或 `orchestrator/progress.md`。
- 非平凡子任务必须先写 `heartbeat.md`。
- 中大型任务必须用 `progress.md`、草稿或 manifest 表达阶段进展。
- planner 第一阶段只写 `plan.md`，不同时创建全部任务目录和 VC。
- 多文件生成拆成 `planner -> task-splitter -> vc-writer -> contract-validator`。
- 主会话执行 orchestrator 的 dispatch request，不在长流程中另起一套临时任务体系。
- 主会话在每批子任务完成后，必须先把结果回传给 orchestrator，由 orchestrator 生成 D02/D03；主会话不得凭结果自行决定下一批。
- `codex/references/file-driven-agent-orchestration.md` 中应维护 controller checklist 和 protocol violation 规则，用于识别“主会话抢活”“无 dispatch 跳批”“未回传 orchestrator 就推进”等流程偏差。
- dedicated orchestrator 还应维护 `orchestrator/status.md`，作为 controller loop 的短事实源，告诉主会话当前是 `waiting_controller`、`waiting_child`、`planning_next_batch` 还是 terminal state。
- 主会话一旦启动 dedicated orchestrator，就必须执行 controller loop，直到 `completed`、`blocked`、`human_required` 或 `paused`；不能因为一个子任务完成就自然停住。
- 引入 Lean Controller Loop：dedicated orchestrator 每批除完整 `dispatch.md` 外，还必须写 `orchestrator/controller-action.md`；每个待派发任务写 `tasks/Txx/prompt.md`；主会话正常路径只读 `status.md` + `controller-action.md`，用 prompt 文件路径派发子代理，只有异常或审计时才读完整 `dispatch.md`。
- 子任务完成后优先写 `result-summary.md`，主会话只回传 summary 路径；若缺失 summary，最多读取 `output.md` 前 80-120 行并要求 orchestrator 后续补齐 summary 约定。
- `controller-action.md` 应包含 `user_visible_action`、`scope_digest`、`risk_level`、`requires_memory_write` 和 `expected_changed_paths`，让主会话不用打开完整 prompt 也能解释下一步和后台智能体可见性。
- 主会话每批执行后用标准 `orchestrator/controller-result.md` 模板回传 batch/task、agent_id、summary/output 路径、验证证据、变更文件、scope_check、next_expected_owner 和 blocker。
- 当 `total_wait_s` 大于 300 秒，子任务必须在首个有意义阶段后或 300 秒前写 `progress.md`，否则主会话可以发送收敛指令。
- terminal state 前 dedicated orchestrator 必须写 `run-summary.md`，主会话最终汇报优先读取 `status.md`、`controller-action.md` 和 `run-summary.md`。
- 引入 Delivery Evidence Contract：worker 必须写 `output.md` + `result-summary.md`，包含准确验证命令、观察结果、未验证项和残留风险；用户可见行为变化必须写 `How To Use` / `Fan Manual Verification`。
- 引入 Context Surface Sync：当实现、架构、验证状态或使用方式改变项目当前事实时，必须同步项目 `README.md`、`AGENTS.md`、`memory-hub/MEMORY.md`、详细 memory 文件和 run 报告，不能只把结论留在聊天或子任务输出里。
- 引入 Run Closure Gate：多 Agent run 进入 terminal state 前，必须使用 `run-closure` Skill 或派发 `authority_skill: run-closure` 的收口任务，生成中文 `00-运行总览.md`、`01-验证与证据.md`、`02-人工复验指南.md`；没有三件套不得标记 completed。
- terminal state 写入后，dedicated orchestrator 必须复核并必要时回刷中文三件套，确保 `00-运行总览.md`、`01-验证与证据.md`、`02-人工复验指南.md` 与 `orchestrator/status.md`、`run-summary.md` 的最终状态一致；若仍显示等待回验或 `terminal_state: none`，不得视为完成。

## 等待策略

- dedicated orchestrator：60 秒内应出现 `orchestrator/heartbeat.md`；3 分钟内应出现 `orchestrator/dispatch.md`、`orchestrator/progress.md` 或草稿。
- 小型单文件任务：60 秒内应出现 `output.md`，120 秒无产物可升级处理。
- 中型计划/评审任务：60 秒内应出现 `heartbeat.md`，3 分钟内应出现 `progress.md`、草稿或最终输出，总等待 8-12 分钟。
- 多文件生成任务：60 秒内应出现 `heartbeat.md`，3 分钟内应出现 manifest/progress，总等待 12-20 分钟且必须有阶段产物。
- 所有 `total_wait_s > 300` 的任务：300 秒内应出现 `progress.md` 或最终 `result-summary.md`，否则 controller 发收敛/诊断指令。

## 配置落点

- `codex/references/file-driven-agent-orchestration.md`
- `codex/prompts/agents/orchestrator.md`
- `codex/prompts/agents/planner.md`
- `codex/AGENTS.md`
- `codex/skills/run-closure/SKILL.md`

## 验证方式

部署到 `C:\Users\fanjiang\.codex` 后，runtime 文件中应能检索到 `Dedicated Orchestrator`、`Semantic role: orchestrator`、`orchestrator/dispatch.md`、`orchestrator/status.md`、`orchestrator/controller-action.md`、`orchestrator/controller-result.md`、`run-summary.md`、`tasks/Txx/prompt.md`、`result-summary.md`、`user_visible_action`、`scope_digest`、`Lean Controller`、`Controller Event Loop`、`Terminal States`、`Delivery Evidence Contract`、`Fan Manual Verification`、`Context Surface Sync`、`Run Closure Gate`、`run-closure`、`00-运行总览.md`、`01-验证与证据.md`、`02-人工复验指南.md`、`terminal_state: none` 过期状态检查、`heartbeat.md`、`progress.md`、`task-splitter`、`vc-writer` 和等待窗口规则。
