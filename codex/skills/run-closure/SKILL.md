---
name: run-closure
description: Use when closing, summarizing, rebuilding, or reviewing a multi-agent run under 08_Reports/runs/{run-id}; generates Chinese fan-facing run entry files, aggregates task evidence, writes verification/manual-review summaries, and decides whether project memory-hub surfaces must be updated. Trigger before any orchestrator marks a run completed/blocked/human_required/paused, or when the user asks where to see run results, validation data, or how to verify a run.
---

# Run Closure

Run Closure 收口一个文件驱动 multi-agent run，让 fan 不必翻散落的 `output.md`、聊天记录或原始日志。

## 适用场景

必须使用：

- orchestrator 准备写 terminal state：`completed`、`blocked`、`human_required`、`paused`；
- 用户问“这个 run 做完了吗”“验证数据在哪”“我怎么自己验证”“总结这个 run”；
- 需要回填旧 run 的可读入口；
- run 改变了项目当前状态、架构、验证结论或使用方式。

不适用：

- 还没产生任何任务输出的早期规划；
- 单个小任务且没有 `08_Reports/runs/{run-id}/`；
- 长期知识库同步。跨项目长期沉淀用 `memory-bridge`。

## 输入

最少需要：

- run 目录：`08_Reports/runs/{run-id}/`

优先读取：

1. `state.yaml`
2. `orchestrator/status.md`
3. `orchestrator/controller-result.md`
4. `run-summary.md`
5. `blocked-items.md`
6. `tasks/*/result-summary.md`
7. `tasks/*/output.md`
8. `tasks/*/verify.md`
9. `run-log.md`，仅在缺少摘要或需要恢复历史 run 时读取

## 必须产出

在 run 根目录写中文三件套：

```text
00-运行总览.md
01-验证与证据.md
02-人工复验指南.md
```

每个非平凡任务目录应有中文：

```text
tasks/Txx-xxx/result-summary.md
```

如果任务已有英文摘要，保留原文文件，新增或改写中文 `result-summary.md` 即可。

## 三件套内容

### `00-运行总览.md`

回答：这次到底做完没、结论是什么、去哪看。

必须包含：

- 一句话结论；
- terminal state 或当前状态；
- 是否有阻塞；
- 是否改代码/文档/配置；
- 关键交付物路径；
- 任务环节表；
- 下一步建议。

如果 run closure 是在 terminal state 前生成的占位收口，orchestrator 写入最终 `completed`、`blocked`、`human_required` 或 `paused` 后，必须回刷本文件，让它和 `orchestrator/status.md`、`run-summary.md` 的最终状态一致。不得保留“等待 orchestrator 回验”“terminal_state: none”等过期措辞作为 fan 的第一入口。

### `01-验证与证据.md`

回答：最后验证数据和证据在哪里。

按 run 类型写：

- 代码实现：测试命令、退出码、关键输出、报告路径；
- CLI/工具：可执行命令、结果、生成文件；
- 方案评审：输入、独立评估任务、综合判断、scope 检查；
- 文档/记忆：变更文件、检查项、未自动验证原因。

没运行验证时，必须写：

```text
not_run: 原因 + 残留风险
```

### `02-人工复验指南.md`

回答：fan 自己怎么确认。

必须包含：

- 本机执行命令或打开路径；
- 应看到的关键输出；
- 如何判断通过/不通过；
- 不适用自动化验证时的人工检查步骤。

人工通过标准必须检查 fan-facing 三件套与 `orchestrator/status.md` 的 terminal state 是否一致；若不一致，本 run closure 不能视为完成。

## 是否同步 memory-hub

只在 run 改变项目长期事实时同步。

| run 结果 | 位置 |
|---|---|
| 当前实现状态改变 | `memory-hub/status/` |
| 架构理解改变 | `memory-hub/architecture/` |
| 流程/规则决策改变 | `memory-hub/decisions/` |
| 验证结论改变 | `memory-hub/reviews/` |
| 重复踩坑 | `memory-hub/lessons/` |
| 规则冲突 | `memory-hub/conflicts/` |

同时更新 `memory-hub/MEMORY.md` 的短索引和触发卡。

临时探索 run 不改变项目事实时，不写 memory-hub，只保留 run 三件套。

## 语言规则

- 面向 fan 的 Markdown 默认中文。
- 命令、路径、代码标识、原始终端输出可以保留原文。
- 不要把英文 `functional-test-report.md` 作为新规范入口；优先使用 `01-验证与证据.md`。

## 禁止事项

- 不伪造测试或验证结果。
- 不把未运行的检查写成通过。
- 不删除或重写原始审计日志来“美化历史”。
- 不把敏感信息、token、cookie、私钥、本地 runtime 状态写入 memory-hub 或 run 总览。
- 不替代 actual implementation、review 或 validation；本 Skill 只收口和聚合证据。

## 完成检查

完成前确认：

- `00-运行总览.md` 存在且中文可读；
- `01-验证与证据.md` 存在，包含验证结果或 `not_run`；
- `02-人工复验指南.md` 存在，fan 能按步骤复查；
- 若 orchestrator 已写 terminal state，三件套和 `run-summary.md` 不含过期状态，且与 `orchestrator/status.md` 一致；
- 任务级 `result-summary.md` 足够支撑总览；
- 如需同步 memory-hub，已更新对应正文和 `MEMORY.md`；
- final 回复中告诉 fan 优先看哪个文件。
