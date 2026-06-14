---
name: workflow-batch
description: batch_process 完整流程——多独立任务并行处理
metadata:
  type: workflow
  agent: orchestrator
  pattern: batch_process
  updated: 2026-06-12
---

# batch_process：批量并行处理流程

多个独立任务并行执行，最大化吞吐量。

## 触发条件

用户意图 = "批量处理 X" / "并行做 Y" / 多个独立任务一次性完成

## 前置条件

- VC 文件已就绪
- planner 已标记并行组和串行组

## 流程图

```
planner（标记并行组 + 串行组）
  → ∥ worker-code(1..N) ────── 无写冲突并行
  → → worker-code(N+1..M) ──── 有写冲突串行
  → ∥ code-reviewer(1..N) ──── 各 worker 完成后并行
  → ∥ contract-validator(1..N) ─ 各 review PASS 后并行
  → 汇总报告
```

## 详细步骤

### Step 1: 派 planner 分组

```
Agent("planner", Context Card = {
  项目定位: 项目类型 + 工作目录
  PRD 或 VC 路径: VC 文件
  workflow_pattern: batch_process
  批量任务清单: 所有待处理任务
  禁止事项: 不写代码/不调 Skill 执行
})
```

planner 产出：
- **并行组**：无写冲突的任务，可同时执行
- **串行组**：有写冲突的任务，按依赖顺序串行
- 每组内任务的任务描述 + VC 绑定

### Step 2: 并行执行

```
parallel(
  并行组.map(task => () =>
    Agent("worker-code", Context Card = {
      任务描述: task.description
      VC 断言摘录: task.vc_bindings
      skill: task.skill
      // ...其他 Context Card 字段
    })
  )
)
```

### Step 3: 串行执行（有冲突的任务）

按拓扑序逐个执行，每个完成后记录 agent_id 和产出路径。

### Step 4: 并行 Code Review

```
parallel(
  completed_tasks.map(task => () =>
    Agent("code-reviewer", Context Card = {
      产出路径: task.result_path
      VC 断言摘录: task.vc_bindings
    })
  )
)
```

### Step 5: 并行验收

```
parallel(
  review_passed_tasks.map(task => () =>
    Agent("contract-validator", Context Card = {
      产出路径: task.result_path
      VC 断言摘录: task.vc_bindings
    })
  )
)
```

### Step 6: 汇总

统计通过/失败/修复次数，生成 `08_Reports/Summary-batch-{YYYYMMDD}.md`。

## 流控规则

| 条件 | 行为 |
|------|------|
| 同文件写冲突 | 强制串行，标记"写冲突: {文件}" |
| fix_iterations > 2（单个任务） | 该任务暂停/降级，其他任务继续 |
| 全部任务 fix_iterations > 2 | 整体暂停/降级 |
| 并行 worker 数 > 可用槽位 | 排队，无限制 |

## 写冲突检测

planner 产出的并行组必须通过写冲突检测：
1. 列出每个任务预期修改的文件
2. 交集不为空 → 移至串行组
3. 交集为空 → 保留在并行组

orchestrator 负责二次确认：派发前检查 Context Card 中的文件指针是否有交集。

## 状态文件更新

```yaml
workflow_pattern: batch_process
tasks:
  - id: B1
    name: ""
    group: parallel | serial
    status: pending → in_progress → completed | failed
    result_path: ""
    agent_id: ""
    fix_iterations: 0
    conflicts_with: []  # 写冲突的任务ID列表
```
