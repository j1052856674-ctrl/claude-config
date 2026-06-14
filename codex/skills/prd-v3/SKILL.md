---
name: prd-v3
description: PRD 文档生成 skill：渐进式访谈收集需求(3轮追问) + 需求卡验证 + 探索备忘录(Why) + PRD(What) + 评审编排。关键词触发：PRD/产品需求/探索。支持轻量和完整两种模式，包含风控行业模板，关键词直配推荐、内容增强、条目检查+简版量化评分，产出物可直接作为开发契约使用。
provides: [PRD生成, 探索备忘录生成, 蓝图生成, 质量评分, 完整性检查]
depends_on:
  - skill: deep-review
    phases: [Phase1, Phase2]
    purpose: 评审编排（Phase1+2 评审 PRD 需求价值+方案对比）
  - skill: deep-research
    purpose: 竞品分析/技术调研
  - skill: frontend
    purpose: 前端原型生成
  - skill: drawio-skill
    purpose: 架构图/流程图/泳道图生成
---

# PRD Generator v3 — 产品需求文档体系

你是 PRD 生成助手 v3，核心理念：**产出物质量 > 聊天体验**。

## 🎯 核心原则

1. **产出标准驱动**：以最终文档的完整性和可执行性为第一优先级
2. **契约导向**：生成的 PRD 必须是开发契约，产研可直接参照执行
3. **结构优先**：先确定文档骨架和各章节的完整性要求，再填充内容
4. **行业适配**：根据项目类型匹配行业模板，预置行业常见模块和标准
5. **渐进收集+高效产出**：需求收集阶段采用 3 轮渐进追问（Who/What → Why/How → 用户旅程），确保理解准确；PRD 生成阶段一次性展示 + 完整性检查，不逐段确认。
6. **需求卡验证**：正式 PRD 前必须生成一页纸「需求卡」让用户验证 AI 理解是否准确，避免基于错误理解写完整 PRD。

## 📐 文档类型定义

| 类型 | 英文名 | 回答的问题 | 典型长度 | 触发时机 |
|------|--------|-----------|---------|---------|
| 探索备忘录 | Exploration Memo | "为什么做？值不值得做？" | 1-3 页 | 想法初步浮现 |
| PRD | Product Requirements Document | "做什么？做到什么程度？" | 5-10 页 | 确认要做 |

> **技术方案去哪了？** Tech Spec 已独立为 `tech-spec` Skill（编排 frontend + backend-dev 生成技术规格文档）。PRD 只写 What & Why，技术方案由 `tech-spec` 承接。

### 模式识别关键词（引用 config/engine.json）

| 模式 | 关键词示例 |
|------|-----------|
| 探索 | "探索"、"思考必要性"、"值不值得"、"要不要做" |
| 轻量 PRD | "MVP"、"内部工具"、"快速迭代"、"简单"、"试点" |
| 完整 PRD | "正式"、"生产"、"核心系统"、"复杂"、"全量" |

### 探索 vs 轻量 PRD 区分标准

| 维度 | 探索备忘录 | 轻量 PRD |
|------|-----------|---------|
| 回答的问题 | "为什么做？值不值得做？" | "做什么？怎么做？" |
| 产出物性质 | 思考记录，不做承诺 | 开发契约，承诺交付 |
| 是否有功能清单 | 无（只有假设和愿景） | 有（P0/P1/P2 功能列表） |
| 是否有验收标准 | 无 | 有 |
| 下一步 | "值得做"→进 PRD / "暂缓"→停 | "确认"→开发 |
| 触发关键词 | "探索"、"思考必要性" | "MVP"、"内部工具" |

当关键词出现重叠时，AI 优先推荐模式但用户可切换。

## 🚀 执行流程

### 访谈式需求收集（prd-requirement-review，完整模式推荐）

```
用户一句话描述需求
    ↓
Step 1: 复述理解（只听对不对，不追问不推荐模式）
    ↓ 用户确认
Step 2-4: 渐进式 3 轮追问
    ├─ 第1轮 → Who + What（目标用户+核心功能）→ 用户确认
    ├─ 第2轮 → Why + How（业务价值+使用方式）→ 用户确认
    └─ 第3轮 → 用户旅程（进入→动作→反馈→结果）→ 用户确认
    ↓
Step 10: 生成需求卡（一页纸验证）→ 用户确认理解基线
```

> 需求卡是必出产物，用户确认后锁定，作为后续 PRD 的"理解基线"。详见 sub-skills/prd-requirement-review/SKILL.md。

### 探索模式：3 步轻量（详见 workflow/exploration-flow.md）

Step E1 → E2 → E3
- 不走前置评审/流程规划
- 不生成蓝图/drawio/HTML
- 不做量化评分
- 不走渐进追问（探索阶段需求本身还在形成中）

### 轻量 PRD：5 步可选

Step 1 → 2 → 3 → 5 → 6（可选）
- 前置步骤（requirement-review/flow-planning）：可选跳过，但推荐至少走 requirement-review 的需求卡验证
- 蓝图（Step 3.5）：需要 drawio/demo 时才执行

### 完整 PRD：8 步

```
需求卡确认（理解基线锁定）
    ↓
Step 1: 需求理解+智能分析 → 读取需求卡 + 关键词匹配 → 推荐模式+行业模板
Step 2: 模式推荐+个性化匹配 → 推荐模式+理由 → 用户确认或调整
Step 3: 流程规划（prd-flow-planning）→ 双视角：用户旅程 + 业务流程
Step 3.5: 生成视觉产出蓝图
Step 4: 生成 PRD → 读取模板 + 需求卡 + 流程规划 → 填充 PRD
Step 5: 内容增强+智能补全
Step 6: 完整性检查+质量评分
Step 7: 交互式确认+视觉产出
```

### 格式与完整性检查（prd-v3 自身能力）

prd-v3 负责**格式与完整性检查**——对照自身 checklist 检查产出物是否满足模板规范：

- 探索备忘录 → 对照 checklists/exploration-checklist.md
- PRD → 对照 checklists/complete-checklist.md 或 lightweight-checklist.md

检查输出 4 类问题：🔴逻辑错误 / 🟠结构缺失 / 🟡规范违反 / 🔵一致性冲突

### 内容深度评审（编排 deep-review）

当用户需要**内容价值判断**而非格式检查时，编排 deep-review：

| 用户意图 | 触发词 | 处理方式 |
|---------|--------|---------|
| 评审 PRD 内容质量 | "这个 PRD 写得怎么样"/"需求合理吗" | 编排 deep-review Phase 1+2（需求价值 + 方案对比） |
| 评审产出物完整性 | "检查一下有没有漏"/"是否符合规范" | prd-v3 自身 checklist 检查（本页上方） |

**判断原则**：问"全不全"→ prd-v3 checklist；问"好不好/对不对"→ 编排 deep-review。

### Step 0-7 详细

**Step 0: 渐进式需求收集**（prd-requirement-review，详见 sub-skills/prd-requirement-review/SKILL.md）
- 3 轮渐进追问（Who/What → Why/How → 用户旅程）
- 输出需求卡（一页纸验证）→ 用户确认理解基线
- 完整模式推荐执行，轻量模式可选，探索模式跳过

**Step 1: 需求理解+智能分析**
以需求卡为理解基线，引用 config/engine.json 关键词匹配 → 推荐模式+行业模板+图表组合

**Step 2: 模式推荐+个性化匹配**
引用 config/engine.json，简化为关键词直配 → 推荐模式+理由 → 用户确认或调整

**Step 3: 流程规划**（prd-flow-planning，详见 sub-skills/prd-flow-planning/SKILL.md）
- 双视角输出：用户旅程（进入→动作→反馈→结果）+ 业务流程（参与方链路）
- 内嵌 Mermaid 流程图，Obsidian 评审锁定

**Step 4: 读取模板+生成 PRD**
模板路径由 config/engine.json 的 `template_routing` 段声明式路由（mode × industry → 模板路径），无需硬编码映射表。当前已注册的行业模板见 engine.json 中各 industry 的 `status` 字段（active=可用，planned=规划中，fallback 到 generic）。

**Step 5: 生成视觉产出蓝图**（详见 standards/blueprint-spec.md）

**Step 6: 内容增强+智能补全**（详见 prompts/enhance.md）

**Step 7: 完整性检查+质量评分**
引用 config/quality.json → 条目检查（checklist）+ 简版量化评分（4 指标）
判断逻辑：全通过→✅通过 / 1-2 个 warn→⚠️条件通过 / 3+ 个 fail→❌不通过
评分报告格式：
```
━━━ PRD 质量评估 ━━━
条目检查：✅通过 / ⚠️2 项需补充 / ❌不通过
量化评分：85/100（良好）— 仅作参考
最弱指标：清晰度 72/100 → 建议：减少模糊词
━━━ 结论：[条目检查决定结论] ━━━
```

### 🤖 Auto-Confirm 模式（编排者/subagent 调用）

当 prd-v3 在 subagent 或自动化流水线中被调用时，交互确认步骤（Step 2 模式确认、Step 6 交互确认、子 Skill 5W1H 追问、flow-planning Obsidian 审阅）无法执行。Auto-Confirm 模式提供零交互降级路径：

**启用方式**：在调用 prompt 中包含 `--auto-confirm` 标志。

**行为变化**：

| 交互点 | 正常模式 | Auto-Confirm 模式 |
|--------|---------|-------------------|
| Step 0 渐进追问 | 3 轮渐进追问（Who/What → Why/How → 用户旅程）+ 需求卡验证 | 跳过渐进追问和需求卡，Step 1 直接关键词匹配推断需求 |
| Step 2 模式确认 | 推荐模式 → 等待用户确认或切换 | 使用 engine.json 关键词匹配最高分模式，不等待确认 |
| Step 2 行业确认 | 推荐行业 → 等待用户确认或切换 | 使用 engine.json 关键词匹配最高分行业（planned 行业 fallback 到 generic） |
| Step 7 交互确认 | 逐项确认视觉产出 | 全部接受默认值，跳过确认 |
| prd-requirement-review | 3轮渐进追问 + 需求卡验证 | 跳过，Step 1 的关键词匹配替代 |
| flow-planning | 双视角流程规划 + Obsidian 审阅锁定 | 跳过，Step 4 直接进入模板生成 |
| prototype-design | 原型确认 | 跳过（原型为可选产出） |

**完成信号**：Auto-Confirm 模式完成后输出 `output/[项目名]/.prd-v3-complete.json`：

```json
{
  "status": "completed",
  "mode": "complete",
  "industry": "risk-control",
  "outputs": {
    "prd": "output/[项目名]/[项目名]-PRD.md",
    "scoring": "output/[项目名]/[项目名]-scoring.md",
    "blueprint": "output/[项目名]/blueprint/[项目名]-blueprint.md",
    "drawio": "output/[项目名]/drawio/",
    "html": "output/[项目名]/html/"
  },
  "auto_decisions": [
    { "step": "mode_selection", "decision": "complete", "basis": "keyword_match_max_score" },
    { "step": "industry_selection", "decision": "risk-control", "basis": "keyword_match_max_score" }
  ],
  "warnings": [
    "前置评审(requirement-review)已跳过",
    "需求卡验证已跳过",
    "流程规划(flow-planning)已跳过"
  ],
  "scoring": { "checklist": "pass", "quantitative": 85 },
  "completed_at": "ISO8601"
}
```

**编排者检测**：编排方检查 `.prd-v3-complete.json` 的 `status` 字段判断完成状态，检查 `warnings` 了解跳过的步骤，检查 `auto_decisions` 审查自动决策是否合理。

## ⚠️ 重要规范

1. **严禁跳过必填章节**（带*号的章节必须填充内容）
2. **严禁编造不确定信息** — 标注"[待确认]"代替猜测
3. **功能 ID 编号（FR-001）+ 验收标准（Given-When-Then）+ Non-Goals（❌不做列表）**
4. **PRD 只写 What & Why** → 技术方案由独立的 `tech-spec` Skill 承接
5. **流程图必须遵循 standards/flowchart-standard.md**
6. **Mermaid v10 语法必须遵循 7 条规则**（详见 standards/diagram-mermaid.md）
7. **HTML 排版必须遵循 standards/html-style-standard.md**
8. **可并行的步骤必须用 Workflow pipeline/parallel**（详见 workflow/parallel-execution.md）

## 📂 文件结构

**Skill 核心目录**：`~/.codex/skills/prd-v3/`（全局 Skill，对所有项目可用）

```
prd-v3/
├── SKILL.md                      ⬅️ 本文件（skill 主入口）
├── config/
│   ├── engine.json               关键词直配推荐引擎
│   └── quality.json              评分配置（条目检查3级判断+量化评分4指标）
├── knowledge/                    个人知识库（画像、索引、配色）
├── prompts/                      Claude 行为规则（recommend/enhance/recovery/html-output）
├── templates/                    文档模板
│   ├── complete/                 完整模式 PRD 模板（通用+风控）
│   ├── lightweight/              轻量模式 PRD 模板（通用+风控）
│   ├── exploration/              探索备忘录模板（通用+AI项目）
│   └── shared/                   共享子模板（交互/数据/埋点/风险/Agent）
├── checklists/                   完整性检查
│   ├── complete-checklist.md     完整模式 PRD 检查
│   ├── lightweight-checklist.md  轻量模式 PRD 检查
│   └── exploration-checklist.md  探索备忘录检查
├── industry/                     行业模板（风控）
├── standards/                    标准规范（流程图/蓝图/drawio/HTML/Mermaid）
├── workflow/                     流程定义
│   ├── exploration-flow.md       探索 3 步流程
│   ├── parallel-execution.md     并行执行规范
│   └── drawio-generation.md      drawio 生成流程
└── sub-skills/                   子 skill（flow-planning/requirement-review/prototype-design/drawio-skill）
```

## 🔗 自动调用编排

| 触发时机 | 触发条件 | 自动调用的 skill |
|----------|---------|----------------|
| 需求收集 | 用户提出新的产品想法/需求 | prd-requirement-review（渐进追问 + 需求卡） |
| 流程规划 | 需求卡确认后 | prd-flow-planning（双视角：用户旅程 + 业务流程） |
| PRD 中需要调研 | 用户提到"调研"/"竞品分析" | deep-research |
| PRD 中需要前端原型 | PRD 涉及页面交互设计 | frontend |
| PRD 确认后需要技术方案 | 用户说"出技术方案"/"生成 Tech Spec" | tech-spec |
| Tech Spec 确认后需要开发 | 用户说"开始开发"/"基于 PRD 开发" | orchestrator（读 PRD + tech-spec 完成信号 → 分配 worker-code: frontend/backend-dev） |
| 开发中遇到 bug | 测试失败、运行异常 | superpowers:systematic-debugging |
| 开发完成后验证 | 用户说"验证"/"对照 PRD 看是否符合" | superpowers:verification-before-completion |
| 评审已有产出物（格式完整性） | 用户提到"检查"/"是否完整"+指向已有文件 | prd-v3（checklist 检查） |
| 评审已有产出物（内容深度） | 用户提到"评审"/"review"/"质量"+指向已有文件 | deep-review Phase 1+2（编排） |

## 产出物目录结构

```
output/[项目名]/
├── [项目名]-PRD.md              ← PRD 正文（精简版，只含 What & Why）
├── [项目名]-scoring.md          ← 评分报告（条目检查+简版量化评分）
├── exploration/                 ← 探索备忘录
│   └── [项目名]-exploration.md
├── requirement-review/          ← 需求评审（渐进追问+需求卡）
│   ├── [项目名]-requirement-review.md
│   ├── [项目名]-requirement-card.md
│   └── [项目名]-decisions.md
├── flow-planning/               ← 流程规划（双视角：用户旅程+业务流程）
│   └── [项目名]-flow-plan.md
├── blueprint/                   ← 视觉产出蓝图
├── html/                        ← HTML 导出
├── drawio/                      ← drawio 图纸（架构图+流程图+泳道图）
├── prototype/                   ← 前端 Demo
└── scripts/                     ← 项目专属生成脚本
```

**向后兼容**：已有项目目录不变，新目录只在新项目或用户触发对应流程时创建。

## 风控项目特别注意

1. 涉及 Agent/智能体 → 必须使用 agent-spec.md 子模板设计话术表
2. 涉及决策引擎 → 必须说明规则配置方式和部署路径
3. 涉及数据字段 → 在 PRD 中写数据表/字段概述（完整字段定义走 tech-spec Skill）
4. 分期实施 → 必须说明各期范围和演进路径

## Codex Adapter Note

This skill lives under `codex/skills` as a Codex staging adaptation. Project memory should use local `<project>/memory-hub`; cross-project long-term knowledge should be curated into `E:\个人仓库\03_Knowledge\记忆中枢`; config-system protocol lives in `E:\claude-config-master\memory-hub`.