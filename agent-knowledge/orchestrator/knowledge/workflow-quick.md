---
name: workflow-quick
description: quick_analysis 完整流程——纯分析/调研快速路由
metadata:
  type: workflow
  agent: orchestrator
  pattern: quick_analysis
  updated: 2026-06-12
---

# quick_analysis：纯分析/调研快速路由

不经过 planner，直接派 worker-think 执行分析。

## 触发条件

用户意图 = "分析 X" / "调研 Y" / "帮我看看 Z"——纯思考、不出代码。

## 与 planning_loop 的区别

| | quick_analysis | planning_loop |
|---|---|---|
| 产出 | 分析报告 | PRD + VC + 计划 |
| 涉及 Agent | worker-think | analyst + planner + validator |
| 后续可转化 | 可以（用户确认后进入 planning_loop） | 直接进入 dev_loop |
| 适用场景 | 调研/评估/诊断 | 开发新功能 |

## 流程图

```
用户意图
  → worker-think（分析/调研）
    → 分析报告
      → 用户确认
        ├─ 调研完成 → 结束
        └─ 转化为开发 → 进入 planning_loop
```

## 详细步骤

### Step 1: 意图确认

识别是否为纯分析任务：
- ✅ "分析 X 的性能瓶颈" → quick_analysis
- ✅ "调研 Y 技术选型" → quick_analysis
- ✅ "帮我看看这个设计的合理性" → quick_analysis
- ❌ "实现 X 功能" → planning_loop
- ❌ "修复 Y bug" → debug_cycle

不确定时：问用户"这是纯分析任务还是需要后续开发？"

### Step 2: 派 worker-think

```
Agent("worker-think", Context Card = {
  项目定位: 项目类型 + 工作目录
  分析问题: 用户原始意图
  文件指针: 相关文档/代码路径（如有）
  skill: none（由 worker-think 自主判断）
  禁止事项: 不编码/不跳过不确定项标注
})
```

### Step 3: 展示分析结果

worker-think 产出分析报告后，摘要展示：
- 核心结论（1-3 条）
- 不确定项数
- 建议下一步

### Step 4: 用户决策

AskUserQuestion：
- "结论已确认，调研完成"
- "基于结论进入开发" → 触发 planning_loop，将分析报告作为输入
- "补充分析" → resume worker-think

## 转化为 planning_loop

用户选择"进入开发"时：

1. 分析报告作为 analyst 的输入材料
2. 派 analyst，Context Card 包含：
   - 分析报告路径（附加信息）
   - 用户原始意图
3. 后续走 planning_loop 标准流程

## 状态文件更新

```yaml
workflow_pattern: quick_analysis
tasks:
  - id: Q1
    name: "{分析主题}"
    status: in_progress → completed
    result_path: worker-think 产出
    agent_id: ""
```

## 输出示例

```
输入: "调研 Go 项目主流日志库，推荐一个适合我们的"

路由: 意图=调研分析 → quick_analysis
派发: worker-think("调研 Go 日志库选型，工作目录: e:/project")

worker-think 产出: 08_Reports/Analysis-Go日志库选型-20260612.md
摘要:
  - 推荐: zerolog（零分配+结构化+性能最优）
  - 备选: zap（生态更丰富）
  - 不确定: 团队是否有 ELK 集成需求（如需要，zap 更合适）
  - 下一步: 确认 ELK 需求 → 选型 → 编写封装层

用户反馈: "确认需要 ELK → 用 zap"
转化: 进入 planning_loop → analyst("日志库封装层，zap + ELK 集成")
```
