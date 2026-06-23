---
name: memory-bridge
description: 处理项目 memory-hub、记忆检索、旧 .claude/memory 迁移、跨项目经验沉淀和 bridge 判定。必须在以下场景使用：用户提到“继续上次”“之前是否遇到”“类似 bug”“查踩坑”“按我们的规范”“同步记忆”“沉淀到记忆中枢”“迁移旧记忆”“建立 memory-hub”；或任务涉及项目恢复、迁移、架构调整、AGENTS/CLAUDE/SKILL/规则修改、重复失败、跨项目经验判断。默认只读 scan/search；migrate/sync 写文件前必须确认。
---

# Memory Bridge

Memory Bridge 是项目本地可执行记忆与跨项目长期知识之间的桥接层。它不是 Claude/Codex 的系统级 memory，而是让记忆变得**可审计、可检索、可迁移、可触发使用**的外部认知系统。

## 权威模型

按以下顺序判断权威源：

1. **项目记忆**：`<project>/memory-hub/` 是当前项目事实、有效决策、状态、经验和冲突的权威源。
2. **长期知识**：`03_Knowledge/记忆中枢/` 存放经过提炼的跨项目复用经验。
3. **旧记忆**：`.claude/memory/` 是只读迁移来源，除非用户明确要求，否则不继续写入。
4. **运行时记忆**：`~/.claude`、`~/.codex`、agent cache 只是适配层或缓存，不是长期权威源。
5. **Skill**：Skill 只定义工作流、触发条件和门禁，不存项目事实。

如果这些来源冲突，把冲突记录到 `memory-hub/conflicts/`，不要静默合并。

## 快速模式选择

不要让用户自己判断模式。按场景自动选择：

| 场景 | 模式 | 动作 |
|---|---|---|
| “继续上次”“之前”“类似”“查踩坑”“按规范” | `search` | 检索项目记忆和长期记忆，返回命中与建议 |
| 接手旧项目、恢复中断任务、同一问题失败两次 | `search` | 先找现有状态、架构图、踩坑和决策 |
| 迁移、架构调整、规则修改、Skill 修改前 | `search` | 先查已有决策、触发卡和跨项目经验 |
| “看看记忆现状”“怎么迁”“哪些该沉淀” | `scan` | 只读盘点来源、重复、冲突和候选分类 |
| “建立 memory-hub”“迁移旧 .claude/memory” | `migrate` | 明确确认后写入项目 `memory-hub` |
| “同步记忆”“沉淀到记忆中枢” | `sync` | 明确确认后把 `bridge: true` 候选提炼到长期知识库 |

模式判断优先级：

1. 用户明确说同步、沉淀到长期中枢 → `sync`，写入前确认。
2. 用户明确说迁移、建立 hub → `migrate`，写入前确认。
3. 用户问现状、候选、怎么处理 → `scan`。
4. 用户要继续、查经验、查踩坑、按规范、处理重复失败 → `search`。
5. 不确定时默认 `scan`，不要写文件。

## 工作模式

除非用户明确要求写入，默认使用 `scan`。

| 模式 | 触发语义 | 是否写文件 | 用途 |
|---|---|---:|---|
| `scan` | “看看记忆”、“怎么迁移”、“有没有类似经验” | 否 | 盘点记忆来源、分类候选、报告风险 |
| `migrate` | “迁移 .claude/memory”、“建立 memory-hub” | 是，需确认 | 将旧项目记忆转换到 `<project>/memory-hub/` |
| `sync` | “同步记忆”、“沉淀到记忆中枢” | 是，需确认 | 将选定项目记忆提炼到长期知识库 |
| `search` | “继续上次”、“之前”、“类似 bug”、“查踩坑”、“按我们的规范”、重复失败、迁移/架构/规则/Skill 修改前 | 否 | 检索项目和长期记忆，给出可执行建议 |

禁止把 `migrate` 或 `sync` 作为 `scan` 的隐藏副作用。

## 目录契约

项目级 `memory-hub` 使用以下结构：

```text
memory-hub/
  MEMORY.md
  MEMORY-SPEC.md
  decisions/
  lessons/
  status/
  reviews/
  conflicts/
  _archive/
```

`MEMORY.md` 是短索引和任务路由表，不是全文档案库。它应该告诉 Agent：不同任务要读哪些记忆。

`MEMORY-SPEC.md` 定义 frontmatter、生命周期、触发卡格式和写入规则。

## scan 模式

任何迁移、同步、目录清理前，先运行 scan 思路。

1. 定位记忆来源：
   - `<project>/memory-hub/`
   - 旧 `<project>/.claude/memory/`
   - `03_Knowledge/记忆中枢/`
   - 相关 `AGENTS.md` 或 `CLAUDE.md`
2. 报告当前状态：
   - 是否已有项目级 `memory-hub`
   - 是否存在旧 `.claude/memory`
   - 是否已有长期记忆中枢条目
   - 是否存在重复权威源或冲突
3. 给候选文件分类：
   - `keep-active`：仍影响未来行动
   - `convert-trigger-card`：有用经验，但还不是可执行卡片
   - `pointer-only`：长期知识中已有沉淀，项目侧只需留指针
   - `archive`：历史材料或已被替代
   - `conflict-review`：存在冲突或风险，不能自动合并
4. 输出迁移表。scan 模式不写文件。

## migrate 模式

用于从旧 `.claude/memory/` 收口到 `memory-hub/`。

安全要求：

1. 明确项目根目录。
2. 创建缺失的 `memory-hub/` 目录。
3. 第一批只迁移用户确认或明显仍有效的内容。
4. 旧文件默认原地保留；未获明确确认，不移动、不删除。
5. 新文件写入 `source_memory`，指向旧来源。
6. 新文件补齐生命周期字段。
7. 迁移报告写入 `memory-hub/reviews/` 或 `08_Reports/`。

不要批量移动真实代码项目、依赖目录、运行态、凭据、缓存或本地设置文件。

## sync 模式

用于将选定项目记忆提炼到长期知识库。

只有满足至少一条才同步：

- 经验适用于多个项目。
- 内容是稳定用户偏好。
- 决策会改变未来 Agent 行为。
- 模式能避免重复踩坑。

写入前必须：

1. 搜索 `03_Knowledge/记忆中枢/`，检查已有笔记。
2. 优先合并或留指针，避免重复创建。
3. 去敏化项目路径、内部术语、密钥、PII 和本地运行态信息。
4. 能转成触发卡的经验，必须转成触发卡。
5. 展示候选列表，等待用户确认后再写入。

## search 模式

按以下顺序检索：

1. 当前项目 `memory-hub/MEMORY.md`
2. 当前项目 `memory-hub/**`
3. 长期知识 `03_Knowledge/记忆中枢/**`
4. 仅当新 hub 缺失或用户要求时，检索旧 `.claude/memory/**`

返回结果包含：

- 命中的记忆
- 为什么匹配
- 来源项目
- 当前状态
- 可执行建议
- 可追溯路径

## 触发卡格式

可复用经验应尽量转成以下格式：

```markdown
---
title: ""
status: active
scope: project | cross-project
kind: lesson | decision | preference | status | review
bridge: true
source_memory: []
source_projects: []
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
---

# 标题

## 触发场景
什么时候必须想起这条记忆。

## 必做动作
Agent 应该怎么做。

## 禁止动作
过去踩坑来自哪些错误做法。

## 验证方式
如何确认这条记忆被正确应用。

## 证据来源
这条记忆来自哪里。
```

## 项目目录规则

Obsidian 知识库里的 `04_Projects/` 只放项目卡、索引和归档摘要，不放活跃代码工作区。

活跃代码项目建议放到独立工作区，例如：

```text
E:/Projects/work/
E:/Projects/personal/
E:/Projects/experiments/
E:/Projects/archived/
```

知识库中保留项目卡，记录真实工作目录、记忆入口、状态和关键链接。

## 安全规则

- 默认只做只读盘点。
- 未经用户明确确认，不删除、不移动、不重写旧记忆。
- 不把密钥、令牌、私钥、原始个人信息、本地运行态、缓存、settings 文件写入共享记忆。
- 缺少 `bridge` 字段不等于允许发布敏感内容。
- 不确定是项目特定还是跨项目复用时，保留在项目本地，并标记待评审。
