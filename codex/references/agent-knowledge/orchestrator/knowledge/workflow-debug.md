---
name: workflow-debug
description: debug_cycle 完整流程——Bug 修复闭环
metadata:
  type: workflow
  agent: orchestrator
  pattern: debug_cycle
  updated: 2026-06-12
---

# debug_cycle：Bug 修复闭环

从 bug 描述出发，定位根因→修复→审查→验收。

## 触发条件

用户意图 = "修复 X bug" / "排查 Y 问题" / "Z 报错了"

## 流程图

```
bug 描述
  → worker-think（定位根因）
    → worker-code（修复）
      → code-reviewer
        ├─ PASS → contract-validator
        │          ├─ PASS → ✅ 修复完成
        │          └─ FAIL → resume worker-code ─┐
        └─ FAIL → resume worker-code ────────────┤
                                                  │
  循环上限 2 轮 ←─────────────────────────────────┘
```

## 详细步骤

### Step 1: 收集信息

向用户确认：
- 复现步骤
- 期望行为 vs 实际行为
- 影响范围（是否阻塞、是否有 workaround）
- 相关日志/错误信息

### Step 2: 派 worker-think 定位根因

```
Agent("worker-think", Context Card = {
  项目定位: 项目类型 + 工作目录
  关键规则: CLAUDE.md 调式相关条款（≤200 tokens）
  文件指针: 错误日志文件 + 疑似相关源文件路径:行号（如有）
  分析问题: bug 描述 + 复现信息 + 期望行为 vs 实际行为
  skill: "superpowers:systematic-debugging"（推荐）
  禁止事项: 不编码/不跳过不确定项标注
})
```

验证标准：根因必须具体到文件:行号 + 触发条件 + 机制解释。

### Step 3: 根因确认

- 根因可信（有文件级证据）→ Step 4
- 根因不确定（只有推测）→ 报告用户："定位结论：{摘要}。不确定项：{列表}。建议：{下一步}"
- 定位失败 → 报告用户已知信息和无法定位的原因

### Step 4: 派 worker-code 修复

```
Agent("worker-code", Context Card = {
  项目定位: 项目类型 + 工作目录
  关键规则: CLAUDE.md 编码相关条款（≤200 tokens）
  文件指针: worker-think 定位报告 + 涉及源文件路径:行号
  任务描述: 修复 {bug描述}。根因：{根因摘要}。修复范围：{涉及文件}
  VC 断言摘录: [复现步骤修复后应无错误, 原功能不受影响]
  skill: none
  禁止事项: 不修改无关代码/不扩大修复范围
})
```

### Step 5: Code Review

同 dev_loop Step 3。重点关注：
- 修复是否针对根因（非表面缓解）
- 修复是否引入新问题
- 是否影响原有功能

### Step 6: 验收

同 dev_loop Step 4。VC 断言重点：
- 原 bug 不再复现
- 相关功能路径不受影响
- 异常处理完整

## 流控规则

| 条件 | auto_mode = false（有人值守） | auto_mode = true（无人值守） |
|------|---------------------------|--------------------------|
| fix_iterations > 2 | 暂停，"可能是架构级问题。当前状态：[简述]" | 自动降级接受 → 记录 blocked_items → 继续 |
| worker-think 定位失败 | 暂停，报告已知信息 | 记录定位失败原因到 blocked_items → 继续 |
| 修复需跨模块大范围改动 | 暂停，建议升级为 planning_loop | 记录到 blocked_items → 标记 skip → 继续 |

> auto_mode.enabled 由 orchestrator Step 0 显式确认，规则详见 orchestrator.md。

## 状态文件更新

```yaml
workflow_pattern: debug_cycle
tasks:
  - id: D1
    name: bug定位
    status: completed
    result_path: worker-think 产出路径
    agent_id: ""
  - id: D2
    name: bug修复
    status: in_progress → completed | failed
    result_path: ""
    agent_id: ""
    fix_iterations: 0
```

## 经验沉淀检查

修复完成后检查 worker-code 是否输出了 lessons。如涉及非预期行为且未记录经验，提示用户关注。
