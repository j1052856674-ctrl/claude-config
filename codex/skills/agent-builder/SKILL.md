---
name: agent-builder
description: 通用 Agent 配置助手。当你需要创建新的 Claude Code Agent 角色、为项目定制 Agent 覆盖、或调整已有 Agent 配置时使用。支持从零设计全新 Agent（自定义角色定位、tools、model、指令），也支持基于已有系统级 Agent 创建项目级覆盖。不再局限于固定模板。
---

# Agent Builder — 通用 Agent 配置助手

帮你设计和生成 Claude Code Agent 定义文件。不限于预设模板，可以从零创建任何角色。

## 架构说明

Agent 定义文件支持两层放置：

- **系统级** `~/.claude/agents/<role>.md`：全局可用，跨所有项目。适合通用角色。
- **项目级** `<project>/.claude/agents/<role>.md`：项目专属覆盖。同名 Agent 项目级覆盖系统级。

**现有系统级 Agent**（直接可用，无需重建）：

| Agent | 角色 | 说明 |
|---|---|---|
| `orchestrator` | 编排者 | 四种模式入口（planning_loop/dev_loop/batch_process/debug_cycle） |
| `worker` | 执行者 | 单任务执行 + bug 修复沉淀经验 |
| `planner` | 规划者 | VC → 可执行计划 + 覆盖矩阵，只规划不执行 |
| `code-reviewer` | 已删除 | 能力被 deep-review Phase 4 吸收，不再独立存在 |
| `contract-validator` | 验证者 | 验收+测试执行，不看实现只看 VC 断言和测试结果 |

> 大多数场景直接使用系统级 Agent 即可。场景差异通过项目 AGENTS.md or CLAUDE.md 和编排者派任务时的上下文注入。只有需要不同 tools/model 配置时才创建项目级覆盖。

## 触发条件

- 用户说"创建 Agent"、"新建子 Agent"、"配置 Agent"、"设计 Agent"
- 用户说"我想加一个做 XXX 的 Agent"、"这个项目需要专门的 Agent"
- 用户说"项目级覆盖 Agent"、"定制 Agent 配置"
- 用户输入 `/agent-builder`

## 不触发条件

- 知识库管理工作流（整理 Inbox、体检、MOC 等） → 调用 knowledge-base Skill
- 工作资产审查/开发/转正 → 不适用

## Agent 定义文件格式

每个 Agent 定义文件由两部分组成：

### 1. YAML Frontmatter（必须字段）

```yaml
---
name: "<role-name>"          # 英文小写，用于 Agent 工具的 subagent_type 参数
description: "<触发描述>"     # Claude Code 据此判断何时启动此 Agent。必须详尽，包含角色定位、适用场景、示例对话
model: "sonnet"               # 可选: sonnet, opus, haiku。按角色推理需求选择
color: "<颜色>"               # 可选: red/green/blue/purple/pink/yellow/orange。视觉标识
memory: "user"                # 可选: user/project/none。按角色是否需要跨会话记忆选择
---
```

**description 写法关键**：
- 用英文写（Claude Code 匹配引擎基于英文）
- 包含：角色定位、适用场景列表、2-4 个示例对话（user + assistant 反应）
- 示例格式：`user: "..." \n assistant: "..." \n <launches Agent>`
- 这是 Claude Code 决定何时启动此 Agent 的依据，越具体越好

**model 选择指南**：
- `opus`：需要强推理（代码审查、架构设计、复杂分析）
- `sonnet`：通用执行（大多数 Agent 默认选择）
- `haiku`：快速验证（验收检查、格式校验、轻量扫描）

**memory 选择指南**：
- `user`：需要记住用户偏好/项目上下文（大多数 Agent）
- `project`：只需当前项目上下文
- `none`：纯任务执行，无需记忆（validator 等隔离角色）

### 2. Markdown 指令体（核心内容）

```
你是[角色名]（[英文名]）。[一句话定位]。

## Context Card（调用方启动本 Agent 时必须预传入）
- 项目定位: [1句话]
- 关键规则: [≤200 tokens]
- 文件指针: [≥2 个路径:行号]
- 上级决策: [如适用]
- 禁止事项: [本Agent特有约束]

## 核心纪律
1-5 条不可违反的规则。

## 执行流程
按步骤描述工作流程。

## [角色专属内容]
如 worker 的经验文件格式、orchestrator 的状态文件格式等。

## 禁止事项
明确列出不允许的行为。
```

## 执行流程

### Step 1: 确定需求类型

问用户：

- **新建角色**：从零设计一个当前系统级 Agent 没有的新角色
- **项目级覆盖**：为特定项目定制某个已有系统级 Agent 的配置（如不同 tools/model）
- **调整已有 Agent**：修改系统级或项目级 Agent 的某些字段

### Step 2: 设计 Agent 配置

根据需求类型：

**新建角色**：
1. 明确角色定位：这个 Agent 做什么、不做什么？
2. 检查能力归属：是否与已有 Agent/Skill 能力重叠？（查 `E:/claude-config-master/memory-hub/decisions/skill-capability-ownership.md`）
3. 确定触发场景：什么情况下应该启动此 Agent？
4. 选择 model：按推理需求选择 opus/sonnet/haiku
5. 选择 tools：列出此 Agent 需要哪些工具（参考下方工具列表）
6. 设计指令体：核心纪律、执行流程、禁止事项

**项目级覆盖**：
1. 确认覆盖哪个系统级 Agent
2. 只修改需要变更的字段（tools、model、或部分指令）
3. 保留系统级的核心纪律和禁止事项，不要删减

**调整已有 Agent**：
1. 读取当前 Agent 定义文件
2. 确认修改范围
3. 只修改指定部分，不做无关改动

### Step 3: 确认放置层级

- 系统级 `~/.claude/agents/`：通用角色，跨项目可用
- 项目级 `<project>/.claude/agents/`：项目专属覆盖

**判断原则**：如果这个角色对大多数项目都有用 → 系统级；只对当前项目有意义 → 项目级。

### Step 4: 生成 Agent 定义文件

按照上面定义的格式生成文件。关键检查点：

- frontmatter 四个必须字段完整：name、description、model、color
- description 用英文，包含角色定位、场景列表和示例对话
- 指令体包含核心纪律、执行流程、禁止事项
- **指令体开头必须声明 Context Card 格式**——调用方启动本 Agent 时应预传入哪些信息
- 无占位文本或 TODO

### Step 5: 三层自动诊断（生成后必须执行）

生成或修改 Agent 定义后，必须逐层检查。**任一层不通过即停止，修复后重新检查。**

#### 第一层：能力归属诊断

对照 `E:/claude-config-master/memory-hub/decisions/skill-capability-ownership.md` 的能力归属矩阵，逐项检查：

| 检查项 | 判定标准 | 不通过处理 |
|--------|----------|------------|
| 能力是否已被已有 Agent 覆盖 | 新 Agent 的核心职责与已有 Agent 无重叠 | 放弃新建，改为编排已有 Agent |
| 能力是否已被 Skill 覆盖 | 新 Agent 的能力无已有 Skill 可替代 | 改为在已有 Agent 中调用该 Skill |
| 若为项目级覆盖 | 只修改 tools/model/部分指令，不删减核心纪律 | 恢复被删减的系统级纪律 |

**通过条件**：新 Agent 能力域唯一，不与已有 Agent/Skill 重叠。项目级覆盖不删减系统级核心纪律。

#### 第二层：指令结构诊断

逐项检查指令体的结构质量：

| 检查项 | 判定标准 | 不通过处理 |
|--------|----------|------------|
| **铁律长度** | 每条铁律 ≤50 字 | 精简至 50 字以内 |
| **反驳表/Red Flags 不重复** | 二者只能存在一个。有反驳表则无 Red Flags，反之亦然 | 选一个删除另一个（推荐保留反驳表，删 Red Flags） |
| **每约束只出现一次** | 同一约束不在"核心纪律""禁止事项""Red Flags"多处重复 | 合并到权威位置（核心纪律或禁止事项，不双写） |
| **禁止事项无冗余** | 禁止事项不重复核心纪律已覆盖的约束 | 删除重复项，保留一处 |

**通过条件**：全部 4 项均通过。

#### 第三层：输出格式诊断

逐项检查输出文件的格式完整性：

| 检查项 | 判定标准 | 不通过处理 |
|--------|----------|------------|
| **Context Card 声明** | 指令体开头有 `## Context Card` 章节，≥4 个字段（项目定位/关键规则/文件指针/禁止事项） | 补全 Context Card 声明 |
| **few-shot 输出示例** | 有 `## 输出示例` 章节，含 ≥1 个完整的输入→输出示例（非仅格式模板），≤30 行 | 补充具体 few-shot 示例 |
| **禁止事项完整性** | 禁止事项覆盖了本角色的核心风险边界（≥3 条） | 补充至 ≥3 条 |
| **无占位符** | 全文无 TBD、TODO、"适当处理"、"类似XXX" 等占位文本 | 替换为具体内容 |
| **frontmatter 完整** | name/description/model 三个必须字段存在且非空 | 补全缺失字段 |
| **description 触发精准** | description 包含 ≥2 个示例对话场景 | 补充示例对话 |

**通过条件**：全部 6 项均通过。

### Step 6: 写入并验证

1. 创建目标目录（如不存在）
2. 写入 Agent 定义文件
3. 确认三层诊断全部通过
4. 提示测试方式：`Agent` 工具指定 `subagent_type` 为 name 字段值即可调用

## 可用工具参考

设计 Agent 时可选择的 Claude Code 工具：

| 工具 | 用途 | 适用角色 |
|---|---|---|
| Read | 读取文件 | 几乎所有 |
| Write | 创建新文件 | 内容生产类 |
| Edit | 编辑已有文件 | 修改类 |
| Glob | 搜索文件名 | 探索类 |
| Grep | 搜索文件内容 | 搜索/审查类 |
| Bash | 执行命令 | 代码执行/测试类 |
| Agent | 派子 Agent | 编排/协调类 |
| WebFetch | 获取网页 | 信息采集类 |
| WebSearch | 搜索引擎 | 信息采集类 |
| AskUserQuestion | 询问用户 | 交互类 |

**工具选择原则**：只给 Agent 它完成任务所需的最小工具集。多余工具增加权限风险和上下文噪音。

## Prompt 设计规范

**所有 Agent 的 Prompt 写作必须遵守 `references/agent-prompt-design-spec.md`**。该规范是 Agent Prompt 内容归属的唯一判定标准，核心原则：

- **自给自足测试**：Agent 不读就会犯错 → 必须在 Prompt 里；不读也不会错 → 放外挂知识库
- **三层结构**：元数据 → 核心指令(≤2000 tokens) → 深化材料(agent-knowledge/)
- **标准骨架**：角色定位 → 入口判定 → Skill 路由 → 执行流程 → 输出示例 → 记忆与知识 → 禁止事项 → 链式交接

创建 Agent 时，先用该规范的检查清单（§六）逐条核验，再用本文件的三层诊断（Step 5）做结构验证。

## 参考模式

`references/` 目录中保留了 4 个系统级 Agent 的设计规范模板作为参考模式。创建新 Agent 时可以参考它们的结构设计，但不必照搬。

| 参考文件 | 角色 | 可借鉴点 |
|---|---|---|
| `orchestrator.md` | 编排者 | 4种模式路由（+planning_loop）、C1-C4门禁、Context Card、状态管理 |
| `worker.md` | 执行者 | 单任务聚焦、Skill 自主调用标准、6条编码纪律、经验沉淀 |
| `planner.md` | 规划者 | 只规划不执行、VC 覆盖矩阵、三类路径覆盖 |
| `contract-validator.md` | 验证者 | 双重验证（断言检查+测试执行）、不看实现 |
| `agent-prompt-design-spec.md` | **设计规范** | Prompt 写作铁律、三层结构、自给自足判定表、标准骨架、检查清单 |

## 注意事项

- 项目级同名 Agent 覆盖系统级。覆盖文件配置不当会导致该角色行为异常——只覆盖确实需要变更的字段。
- 系统级 Agent 已包含完整的核心纪律和禁止事项，项目级覆盖时不要删减这些通用规则。
- description 是 Claude Code 自动触发此 Agent 的依据——写得越具体、场景越明确，触发越精准。模糊描述会导致 Agent 被错误触发或漏触发。
- name 字段必须是英文小写无空格，因为它是 Agent 工具 `subagent_type` 参数的值。
- 新建角色时先想清楚"它做什么、它不做什么"——边界清晰比功能全面更重要。
- **Context Card 协议**：编排方启动子 Agent 时必须预传 Context Card。Agent 设计者应在指令头声明"调用方应预传入哪些信息"。详见 `E:/claude-config-master/memory-hub/decisions/skill-capability-ownership.md` §四。

## Codex Adapter Note

This skill lives under `codex/skills` as a Codex staging adaptation. Project memory should use local `<project>/memory-hub`; cross-project long-term knowledge should be curated into `E:\个人仓库\03_Knowledge\记忆中枢`; config-system protocol lives in `E:\claude-config-master\memory-hub`.