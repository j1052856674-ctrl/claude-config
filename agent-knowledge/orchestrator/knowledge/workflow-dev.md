---
name: workflow-dev
description: dev_loop 完整流程——VC 就绪后执行开发任务
metadata:
  type: workflow
  agent: orchestrator
  pattern: dev_loop
  updated: 2026-06-12
---

# dev_loop：开发执行流程

VC + 计划就绪后，按 DAG 顺序执行开发任务。每个编码任务后串行 review + verify。

## 触发条件

- VC 文件存在 + 计划文件存在
- planning_loop 完成后用户确认进入开发

## 前置检查

```
1. Read VC 文件 → 确认断言清单完整
2. Read 计划文件 → 确认任务列表 + DAG
3. 无 VC 或计划不完整 → 停止，退回 planning_loop
```

## 流程图

```
planner（细化为可执行单元）
  → worker-code/worker-think ← fix_iterations ≤ 2 ┐
    → code-reviewer                            │
      ├─ PASS → contract-validator              │
      │          ├─ PASS → 下一个任务            │
      │          └─ FAIL → resume worker ───────┘
      └─ FAIL → resume worker ──────────────────┘
```

## 详细步骤

### Step 1: 派 planner 细化执行

从计划文件中取出当前批次任务，派 planner 细化执行顺序和参数。

### Step 2: 执行任务（按 DAG 拓扑序）

对每个任务，按类型派发：

**impl 任务 → worker-code**：
```
Agent("worker-code", Context Card = {
  项目定位: 项目类型 + 工作目录
  关键规则: CLAUDE.md 编码相关条款（≤200 tokens）
  文件指针: 至少 2 个相关文件路径:行号
  任务描述: 任务名称 + 产出要求
  VC 断言摘录: 该任务绑定的 VC 断言
  skill: recommended_skill 或 null
  禁止事项: 不规划/不验证/不修改VC断言
})
```

**analysis 任务 → worker-think**：
```
Agent("worker-think", Context Card = {
  项目定位: 项目类型 + 工作目录
  关键规则: CLAUDE.md 分析相关条款（≤200 tokens）
  文件指针: 至少 2 个上下文路径:行号
  分析问题: 任务描述
  skill: recommended_skill 或 null
  禁止事项: 不编码/不跳过不确定项标注
})
```

### Step 3: Code Review（每个 impl 任务后强制）

```
Agent("code-reviewer", Context Card = {
  产出路径: worker-code 产出的文件路径
  VC 断言摘录: 该任务绑定的 VC 断言
})
```

- PASS（无 Critical）→ Step 4
- FAIL（有 Critical）→ resume worker-code 修复，fix_iterations++

### Step 4: 验收（review PASS 后）

```
Agent("contract-validator", Context Card = {
  产出路径: worker-code 产出路径
  VC 断言摘录: 该任务绑定的 VC 断言
})
```

- PASS → 标记任务 completed，继续下一个
- FAIL → resume worker-code，fix_iterations++

### Step 5: 汇总报告

全部任务完成后，生成 `08_Reports/Summary-{任务标识}-{YYYYMMDD}.md`：

- 任务完成情况
- VC 通过率
- Critical/Important 问题统计
- 经验沉淀汇总

## 流控规则

| 条件 | auto_mode = false（有人值守） | auto_mode = true（无人值守） |
|------|---------------------------|--------------------------|
| fix_iterations > 2 | 暂停，通知用户："已修复 2 次未通过，可能是架构级问题" | 自动降级接受 → 记录 blocked_items → 继续下一个任务 |
| 同文件写冲突 | 串行执行冲突任务 | 同左 |
| 无写冲突的任务 | 可并行（batch_process 模式） | 同左 |

> auto_mode.enabled 由 orchestrator Step 0 显式确认，规则详见 orchestrator.md。

## 状态文件更新

```yaml
tasks:
  - id: T1
    name: ""
    status: in_progress → completed | failed
    result_path: ""
    agent_id: ""
    fix_iterations: 0
```
