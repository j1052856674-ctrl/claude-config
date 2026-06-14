---
name: skill-mapping
description: planner 任务类型→Skill 详细映射表——含边界案例判定规则和自主调用约束
metadata:
  type: knowledge
  agent: planner
  updated: 2026-06-12
---

# 任务类型 → Skill 映射表

> 本文是 planner Prompt 中任务类型映射的详细版——含边界案例判定规则。

## 核心映射

| 任务类型 | Agent | 默认 Skill | 适用场景 |
|---------|-------|-----------|---------|
| 后端 API/服务 | worker-code | 无 | CRUD/路由/中间件/数据模型 |
| 前端组件/页面 | worker-code | frontend | 组件开发/样式/交互 |
| 全栈功能 | worker-code | dev-workflow | 前后端联动、数据库变更 |
| TDD 要求 | worker-code | superpowers:test-driven-development | VC 中含测试覆盖率断言 |
| 调试定位 | worker-think | superpowers:systematic-debugging | bug 排查/异常定位 |
| 架构分析 | worker-think | 无 | 架构评估/模块分析 |
| 技术调研 | worker-think | 无 | 技术选型/方案对比 |
| 需求评审 | worker-think | deep-review → review-need | 评估需求价值 |
| 方案评审 | worker-think | deep-review → review-approach | 评估技术方案 |
| 代码分析 | worker-think | deep-review → review-code | 代码质量问题诊断 |
| 知识整理 | worker-think | knowledge-base | 提炼笔记/构建MOC |
| 代码审查 | code-reviewer | deep-review → review-code | 代码质量审查 |
| 交付验证 | contract-validator | 无 | VC 断言逐条判定 |

## 边界案例判定

### 编码 vs 分析

| 场景 | 判定 | Agent | 理由 |
|------|:--:|-------|------|
| "实现登录接口" | 编码 | worker-code | 产出代码变更 |
| "设计登录流程" | 分析 | worker-think | 产出设计文档 |
| "写一个技术方案文档" | 分析 | worker-think | 产出文档而非代码 |
| "方案中的示例代码" | 分析 | worker-think | 伪代码不算生产代码 |
| "改配置文件" | 编码 | worker-code | 文件编辑=代码变更 |
| "为什么这个函数慢" | 分析 | worker-think | 分析后可能引出编码任务 |

**决策树**：
```
产出物是代码变更/文件编辑？
  ├─ 是 → worker-code
  └─ 否 → 产出物是报告/文档/分析结论？
           ├─ 是 → worker-think
           └─ 不确定 → 检查用户原话含"分析/设计/调研/评估"→ worker-think
                                              "实现/修复/写/改"→ worker-code
```

### Skill 是否需要指定

| 条件 | 行为 |
|------|------|
| 任务明确目标 Skill | 填入 recommended_skill |
| worker-think 默认分析 | 不填 Skill，worker-think 自主选择 |
| worker-code 默认编码 | 不填 Skill，worker-code 自主选择 |
| 调试场景 | 推荐 systematic-debugging，但不强制 |

### 何时不指定 Skill

- 简单 CRUD 任务——worker-code 自身够用
- 纯文档撰写——不需要 Skill
- 分析任务——worker-think 自主选择调用 deep-review 或其他 Skill

## 自主调用上限

> 此上限由 worker-code/worker-think 的 Prompt 约束，planner 在分配任务时需考虑。

| Agent | 自主调用上限 | planner 策略 |
|-------|:----------:|-------------|
| worker-code | ≤2 个额外 Skill | 指定推荐 Skill 后保留 1 个余量 |
| worker-think | ≤2 个额外 Skill | 同上 |

## 多 Skill 组合

遇到以下任务模式时，planner 应拆分为多个子任务而非让单个 worker 调用多个 Skill：

| 任务模式 | 拆分方式 |
|---------|---------|
| "调研 + 实现" | T-01 worker-think(调研) → T-02 worker-code(实现) |
| "设计 + 评审" | T-01 worker-think(设计) → T-02 worker-think(评审/deep-review) |
| "实现 + 优化" | T-01 worker-code(实现) → code-reviewer → T-02 worker-code(根据 review 优化) |

## 活跃 Skill 清单（供映射参考）

> 此清单随项目 Skill 生态演化，planner 以实际 `~/.claude/skills/` 目录为准。

| Skill | 类型 | 适用 Agent |
|-------|------|-----------|
| frontend | 实现型 | worker-code |
| dev-workflow | 实现型 | worker-code |
| superpowers:test-driven-development | 实现型 | worker-code |
| superpowers:systematic-debugging | 诊断型 | worker-think / worker-code |
| deep-review | 评审型 | worker-think / code-reviewer |
| knowledge-base | 知识型 | worker-think / worker-code |
| prd-v3 | 需求型 | (由 analyst 通过 Skill 工具调用) |
