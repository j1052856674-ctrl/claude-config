---
name: workflow-planning
description: planning_loop 完整流程——从模糊想法到 VC 就绪
metadata:
  type: workflow
  agent: orchestrator
  pattern: planning_loop
  updated: 2026-06-12
---

# planning_loop：新需求方案生成流程

从用户模糊想法出发，逐步澄清→结构化为 PRD→细化 VC→生成执行计划。

## 触发条件

用户意图 = "我要做 X" / "开发 Y 功能" / 新需求

## 流程图

```
用户意图
  → analyst（PRD）
    → contract-validator（VC 预检）  ← fail → resume analyst 修正
      → planner（调 tech-spec 翻译技术约束 → 计划 + VC 完整版）
        → 用户确认
          → VC 就绪 / 进入 dev_loop
```

## 详细步骤

### Step 1: 派 analyst 澄清需求

```
Agent("analyst", Context Card = {
  项目定位: 项目类型 + 工作目录
  关键规则: CLAUDE.md 中分析师相关条款（≤200 tokens）
  文件指针: 项目 CLAUDE.md 路径
  禁止事项: 不写代码/技术方案/架构设计
})
```

- agent_id 写入状态文件
- analyst 可能发起 AskUserQuestion → 暂停流程，展示问题给用户，等回复后 resume

### Step 2: VC 预检

analyst 产出 PRD 路径 → 派 contract-validator：

```
Agent("contract-validator", Context Card = {
  产出路径: PRD 文件路径
  VC 断言摘录: PRD 中初步验收标准
  任务类型: 预检
})
```

- PASS → 继续 Step 3
- FAIL → resume analyst 修正 PRD，修正后重新预检

### Step 3: 派 planner 生成执行计划

planner 内部流程：读 PRD → 调 tech-spec Skill 翻译技术约束 → 拆任务 + 分配 Skill（frontend/backend-dev）→ 绑 VC 断言 → 插 review/verify 门禁。

```
Agent("planner", Context Card = {
  项目定位: 项目类型 + 工作目录
  PRD 路径: analyst 产出的 PRD 文件
  workflow_pattern: planning_loop
  禁止事项: 不写代码/不做需求评审
})
```

### Step 4: C1-C4 门禁检查

| 门禁 | 检查内容 | 不通过行为 |
|------|---------|-----------|
| C1 | PRD 含功能列表 + 非功能约束 + 验收标准 | resume analyst |
| C2 | VC 断言三类全覆盖（N/B/E） | resume planner |
| C3 | DAG 无循环，所有 impl 后有 review+verify | resume planner |
| C4 | 无 TBD/TODO 占位符 | resume planner |

门禁 3 轮未过 → 暂停，通知用户 planner 产出问题。

### Step 5: 用户确认

展示计划摘要（任务数、关键路径、VC 断言覆盖率），AskUserQuestion：
- "按计划执行"
- "调整计划" → resume planner
- "先暂停"

### Step 6: 交接

- 用户确认后 → 更新状态文件 `vc_path` + `plan_path`
- 如有 dev_loop 衔接 → 状态文件记录，输出 `✅ planning_loop 完成，VC 就绪`
- 不自动进入 dev_loop——等用户/编排触发

## 状态文件更新

```yaml
workflow_pattern: planning_loop
prd_path: ""
vc_path: ""
plan_path: ""
```

## 异常处理

| 异常 | 行为 |
|------|------|
| analyst 3 轮澄清后 PRD 仍无功能列表 | 暂停，告知用户需求可能过于模糊 |
| planner 产出 VC 覆盖率 < 80% | resume planner，要求补充 |
| 用户确认中途修改需求范围 | 回到 Step 1（resume analyst） |
