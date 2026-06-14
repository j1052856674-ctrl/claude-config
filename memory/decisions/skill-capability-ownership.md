---
name: skill-capability-ownership
description: Skill 能力归属矩阵——每个能力域的唯一权威 Skill，系统级唯一权威源
metadata:
  type: decision
  created: 2026-06-11
  updated: 2026-06-11
  bridge: false
  lifecycle: permanent
related:
  - ~/.claude/CLAUDE.md Skill 生态管理规范
---

# Skill 能力归属矩阵

> **核心原则**：每个能力域只有一个权威 Skill。其他 Skill 只能编排引用，不能重复实现。
> **存放层级**：系统级（~/.claude/memory/decisions/）——管辖系统级 Skill 的能力归属。项目专属 Skill 的 provides 声明在自身 SKILL.md frontmatter 中，冲突在项目 CLAUDE.md 仲裁，不在此矩阵记录。
> **lifecycle: permanent**：此文件被 CLAUDE.md 规则层引用，不走记忆生命周期（不归档、不淘汰）。

## 一、能力归属表

| 能力域 | 权威 Skill（provides） | 已知使用者（从 depends_on grep 推导，仅供参考） |
|--------|----------------------|---------------------------------------------|
| 评审路由中枢 | deep-review（父 Skill，Step0+Step1+Step2 场景判定→串子Skill） | — |
| 需求价值评审 | review-need（deep-review 子 Skill，可独立调用） | prd-v3, deep-review |
| 方案对比评审 | review-approach（deep-review 子 Skill，可独立调用） | prd-v3, deep-review |
| 多视角隔离评审 | review-approach（隔离模式，视角选择+合成规则） | prd-v3, deep-review |
| 可交付验收完整性检查 | review-need（VC 四段式骨架生成） | orchestrator, deep-review |
| 技术落地验证 | review-tech（deep-review 子 Skill，可独立调用，CLI+工具能力关键词触发） | prd-v3, deep-review |
| 代码审查 | review-code（deep-review 子 Skill，可独立调用，三档路由+L1/L2/L3+诊断JSON） | orchestrator（dev_loop） |
| 运行时验证 | review-code（L1/L2/L3 三层模型） | orchestrator（dev_loop） |
| 诊断输出 | review-code（标准化 JSON） | orchestrator（dev_loop） |
| PRD 生成 | prd-v3 | — |
| Tech Spec 生成 | prd-v3 | — |
| 前端页面生成 + 设计策略 | frontend（v2 自给自足，depends_on: []） | prd-v3 |
| 前端确定性验证（WCAG对比度+反模式检测） | impeccable CLI detector（三方，`scripts/detector/detect-antipatterns.mjs`） | frontend v2 Step 5 可选增强 |
| 前端设计增强（深度打磨） | impeccable prompt 层（三方，21子命令按需触发） | frontend v2 按需编排 |
| 图表生成 | drawio-skill | prd-v3 |
| 图表产出自检 | deep-review Phase 4 标准档（非代码产出验证） | prd-v3 |
| 深度调研 | deep-research | prd-v3 |
| 头脑风暴 | superpowers:brainstorming | prd-v3 |
| 独立验收+测试执行 | contract-validator | orchestrator |
| 独立代码审查 | deep-review Phase 4（内部 spawn Explore subagent 执行只读审查） | orchestrator（dev_loop） |
| 方案生成管线 | orchestrator（planning_loop） | — |
| 编排执行 | orchestrator（dev_loop/batch_process/debug_cycle） | — |
| 记忆同步 | memory-bridge | 所有 skill |
| 快启摘要 | task-snapshot | 所有 skill |
| 自主运行 | auto-mode | — |
| Agent 定义生成/模板实例化 | agent-builder | — |
| Boss 直聘搜索/评分 | boss-assistant | — |
| 标准开发流程 TDD+验证门禁 | dev-workflow（三方） | — |
| 后端全生命周期开发（骨架+API+业务+数据+测试+部署+验收门禁） | backend-dev（父 Skill，语言无关，路由到 backend-fastapi/backend-express/backend-gin 子 Skill） | — |

> **依赖关系（depends_on）的权威源**：每个 SKILL.md 的 frontmatter `depends_on` 字段是依赖关系的唯一权威声明。上表"已知使用者"列仅从 SKILL.md grep 自动推导，不作为权威——不手动维护，不同步更新。矩阵的角色是仲裁能力归属冲突，不是记录所有依赖关系。

## 二、禁止模式

| 模式 | 示例 | 正确做法 |
|------|------|---------|
| 编排方内建评审逻辑 | prd-v3 内建了一套评审维度，与 review-need/review-approach 重复 | 编排 review-need + review-approach |
| 硬编码被编排方细节 | orchestrator 写死 "三档路由的轻量/标准/深度阈值" | 引用式调用——"调 review-code，具体路由和维度见 review-code 定义" |
| 重复实现已验证能力 | 新 skill 自己实现 CLI 验证 | 编排 review-tech |
| 在项目级矩阵中复制系统矩阵 | 项目创建副本矩阵 | 不需要——项目专属 Skill 在 SKILL.md 声明，冲突在项目 CLAUDE.md 仲裁 |

## 三、变更传播规则

1. 修改 provides 列中任意 Skill 的能力范围/Phase 结构/维度定义时：
   - grep 所有 SKILL.md 中 `depends_on.*<skill名>` 找到依赖方
   - 检查每个依赖方的调用点是否需要同步更新
   - 如果改了 Phase 编号或维度数，必须更新所有硬编码引用
2. 新增能力域时：
   - 先查此表确认是否已被覆盖
   - 未被覆盖 → 注册为新行
   - 已被覆盖 → 编排现有权威 Skill，不重复实现

## 四、子Agent 启动上下文协议（Context Card）

所有编排方在启动子 Agent 时，必须在 prompt 中预传入结构化上下文卡片——子 Agent 不应自行探索环境。

| 字段 | 内容 | 必须 |
|------|------|------|
| 项目定位 | 1 句话，本项目是什么 | ✅ |
| 关键规则摘录 | ≤200 tokens 的相关规则 | ✅ |
| 文件指针 | ≥2 个 `文件路径:行号` | ✅ |
| 上级决策摘要 | Phase 1/2 结论（如适用） | 按需 |
| 禁止事项 | 本 Agent 特有的约束 | ✅ |

原则：**调用方不传递文件内容，但传递精确到行号的指针。Subagent 打开文件指定行号直接进入工作——禁止使用"探索"类指令。**

## 五、三方 Skill 管理规则

> 三方 Skill 指来自 superpowers 插件、openclaw 社区等外部源的 Skill。我们**不修改**三方 Skill 源码，只在矩阵中注册其能力域以便编排引用。

### 5.1 注册规则

1. 三方 Skill 在矩阵中只注册 `provides` 能力域，不注册其 `depends_on`（依赖关系以其自身 SKILL.md 为准，我们不维护）
2. 注册时标注 `（三方）` 后缀，区分自研 Skill
3. 三方 Skill 升级后，检查 provides 声明是否变化 → 同步更新矩阵

### 5.2 同能力域重叠处理（已消除）

前端域重叠已在 2026-06-11 重审中消除：ui-ux-pro-max、design-taste-frontend、baseline-ui 已卸载，能力域不再重叠。impeccable 重新定位为两层（CLI 确定性验证 + prompt 设计增强），与 frontend v2 形成互补而非竞争。

详见 `08_Reports/skill-deep-review/skill-merge-decision/re-review-report-v2.md`。

### 5.3 不自研与三方重叠的能力

- 禁止自研与三方 Skill provides 完全重叠的能力域
- 如需扩展三方能力，通过编排（depends_on）+ 薄封装实现，不在自研 Skill 中内建三方已有逻辑
- 三方 Skill 被废弃/停更时，评估迁移成本后决定自研替代或换三方源

