---
title: "Codex 文件驱动子代理可观测性规则"
status: active
scope: config-system
kind: decision
created: "2026-06-26"
updated: "2026-06-26"
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

## 等待策略

- dedicated orchestrator：60 秒内应出现 `orchestrator/heartbeat.md`；3 分钟内应出现 `orchestrator/dispatch.md`、`orchestrator/progress.md` 或草稿。
- 小型单文件任务：60 秒内应出现 `output.md`，120 秒无产物可升级处理。
- 中型计划/评审任务：60 秒内应出现 `heartbeat.md`，3 分钟内应出现 `progress.md`、草稿或最终输出，总等待 8-12 分钟。
- 多文件生成任务：60 秒内应出现 `heartbeat.md`，3 分钟内应出现 manifest/progress，总等待 12-20 分钟且必须有阶段产物。

## 配置落点

- `codex/references/file-driven-agent-orchestration.md`
- `codex/prompts/agents/orchestrator.md`
- `codex/prompts/agents/planner.md`
- `codex/AGENTS.md`

## 验证方式

部署到 `C:\Users\fanjiang\.codex` 后，runtime 文件中应能检索到 `Dedicated Orchestrator`、`Semantic role: orchestrator`、`orchestrator/dispatch.md`、`orchestrator/status.md`、`Controller Event Loop`、`Terminal States`、`heartbeat.md`、`progress.md`、`task-splitter`、`vc-writer` 和等待窗口规则。
