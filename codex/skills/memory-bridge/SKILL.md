---
name: memory-bridge
description: 跨项目记忆桥接 — 双向能力：①同步沉淀（从各项目 memory-hub/ 拉取 bridge:true 记忆→分类沉淀到记忆中枢→更新全局索引）；②经验检索（按关键词/分类搜索已沉淀的跨项目经验，追溯来源项目）。
---

# Memory Bridge Skill

跨项目记忆同步工具。从各项目的 `memory-hub/` 拉取长期记忆，结构化沉淀到长期知识库 `E:\个人仓库\03_Knowledge\记忆中枢`，并更新全局 `E:\claude-config-master\memory-hub\MEMORY.md` 索引。

## 触发条件

- 用户输入 `/memory-bridge` 或"同步记忆"
- 用户提到"沉淀记忆"、"同步项目记忆"、"更新全局索引"
- 用户输入"检索记忆"、"搜索跨项目经验"、"查踩坑记录"、"有没有类似的bug" → 进入经验检索模式

## 前置配置

首次运行前需确认长期知识库路径 `E:/个人仓库/03_Knowledge/记忆中枢`，机器本地覆盖可放 `E:/claude-config-master/memory-hub-sync.json`：

```json
{
  "vault_path": "E:/日常仓库",
  "projects": {
    "e-------": "工作资产库",
    "E------": "AI Worker Hub",
    "E--prd": "PRD项目"
  }
}
```

若配置文件不存在或缺少字段，自动 fallback：
1. `vault_path` 缺失 → 从当前工作目录向上搜索含 `03_Knowledge/记忆中枢/` 的目录
2. `projects` 缺失 → 扫描 legacy Claude project cache directories 下所有哈希目录，通过 git remote 或目录名推断项目名

## 执行流程

### 1. 确认项目列表 + 锁定工作目录

读取机器本地 `E:/claude-config-master/memory-hub-sync.json`。若文件不存在，使用自动探测 fallback 并提示用户创建配置文件。

**关键**：读取 `vault_path` 后，所有文件操作（Glob/Grep/Write/Read）必须使用 `vault_path` 拼接的**绝对路径**作为 `path` 参数。禁止依赖 CWD（当前工作目录）——用户可能在任何项目中触发 `/memory-bridge`。

### 2. 递归扫描各项目记忆

对每个项目，**递归扫描** `memory/**/*.md`（含所有子目录：`lessons/`、`decisions/`、`status/`、`reviews/`、`refs/`、`arch/`、`_archive/`）。自动跳过 `_archive/` 中的文件。

对每个文件，读取 frontmatter 和正文，筛选条件：
- `metadata.bridge: true` 或顶层 `bridge: true` → 纳入同步
- `metadata.bridge: false` → 跳过
- **bridge 字段缺失 → 视为 true**（遵循 UAM bridge 默认值规则）
- 首次运行时全部处理（无论 bridge 字段）

### 3. 分类路由 + 价值排序

按记忆类型路由到记忆中枢对应子目录：

| 记忆特征 | 目标子目录 | 目标 type |
|----------|-----------|-----------|
| 包含"踩坑"、"bug"、"错误"、"编译"、"环境"、"参数"、"兼容"、"崩溃"、"失败" | `通用经验/` 或 `项目记忆/` | `方法` |
| 包含"偏好"、"反馈"、"不喜欢"、"喜欢"、"习惯"、"风格" | `反馈偏好/` | `概念` |
| 包含"项目状态"、"进度"、"架构"、"设计"、"计划"、"里程碑" | `项目记忆/` | `项目` |
| 包含"Skill"、"模板"、"评审"、"规范" | `Skill设计/` | `方法` |

**多规则匹配优先级**：Skill设计 > 反馈偏好 > 通用经验 > 项目记忆

**"通用经验/" vs "项目记忆/" 的判断标准**（规则1的二选一）：
- `source_projects` 数组长度 ≥2 → `通用经验/`
- 内容中出现 ≥2 个不同项目名 → `通用经验/`
- 以上都不满足 → `项目记忆/`

**价值排序**：对每条候选记忆标注价值等级：
- **强推**：跨项目通用经验，与当前关注强相关
- **关注**：项目特定但有通用提炼价值
- **暂缓**：纯项目特定信息，通用价值低

### 4. 展示候选列表 + 用户确认（选择性沉淀）

以表格形式展示候选列表，等待用户选择：

```
| # | 来源项目 | 记忆标题 | 价值等级 | 路由目标 | 与已有笔记关系 |
|---|---------|---------|---------|---------|--------------|
| 1 | AI Worker Hub | Agent CLI 参数不继承 | 强推 | 通用经验/ | 合并到 agent-cli-tooling-lessons.md |
| 2 | PRD项目 | Mermaid v10 display:none bug | 关注 | 项目记忆/ | 新建 |
| 3 | 工作资产库 | 表结构模板偏好 | 暂缓 | 反馈偏好/ | 合并到 审查偏好.md |
```

**用户确认后才执行写入。不自动写入。**（遵循原型模式2：选择性沉淀，防止低价值内容污染知识库）

### 5. 去敏化 + 通用化提炼

写入前对选定内容执行：

**去敏化检查清单**：
- [ ] 移除项目特定绝对路径（如 `C:\Users\xxx\`、`E:\项目名\`）
- [ ] 移除内部业务术语（替换为通用描述）
- [ ] 移除敏感配置（API Key、密码、Token、PII）
- [ ] 保留逻辑骨架和关键参数

**通用化提炼**：从项目特定经验提炼出通用方法论。例："Boss直聘 Cookie 封禁 → 30秒间隔" → "API 限流应对：请求间隔 ≥30秒"

### 6. Dedup + 合并策略

在写入前，搜索 `{vault_path}/03_Knowledge/记忆中枢/` 已有笔记（使用绝对路径的 Grep `path` 参数）：

**查重判断**：
- 文件名相似（标题近义、tags 重叠）
- 内容关键词匹配（Grep 搜索关键段落）
- 同一主题 → 合并，不同主题 → 新建

**合并策略**（需严格遵循）：
1. **内容合并**：按主题分节追加。已有笔记末尾新增 `## [来源项目名] 中的相关经验` 小节，不替换旧内容
2. **source_projects 追加**：将新来源项目名去重追加到已有笔记的 `source_projects` 数组
3. **bridge_sync 更新**：合并后更新 `bridge_sync` 时间戳为当前日期
4. **质量评分**：取 max(已有评分, 新评分)，在 frontmatter 中标注
5. **文件长度检查**：合并前检查已有笔记行数。若已有笔记 ≥180 行（接近 200 上限），不直接合并——提示用户"笔记接近上限，建议拆分"，由用户决定处理方式
6. **supersedes 记录**：合并后将旧文件的 `name` 写入合并笔记的 `supersedes` 字段（遵循 UAM supersedes 记忆合并规则）

### 7. 结构化写入

每个沉淀笔记使用标准 Obsidian frontmatter：

```yaml
---
title: ""
type: 概念/方法/项目/主题地图
status: 生长中
quality: 3
tags: []
source_projects: []
source_memory: []
bridge_sync: "YYYY-MM-DD"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
synopsis: ""
related: []
---
```

**内容要求**：
- 去除推广修辞，保留逻辑骨架和关键参数
- 添加双链到 `03_Knowledge/` 已有相关永久笔记
- 多个同主题反馈合并为一个笔记

### 8. 更新 MOC 索引

更新 `03_Knowledge/记忆中枢/MOC - 跨项目记忆.md`：
- 新增沉淀的笔记条目
- 按分类（项目记忆/通用经验/反馈偏好/Skill设计）分组

### 9. 更新 UAM MEMORY.md

更新 `E:/个人仓库/03_Knowledge/记忆中枢/MOC - 跨项目记忆.md`：
- 在对应 section 添加新的一句话摘要
- 格式：`一句话描述 → 详情: 日常仓库/03_Knowledge/记忆中枢/.../文件名.md`
- 不删除已有条目，只追加或更新

### 10. 回写项目记忆索引

在原项目的 `MEMORY.md` 中添加沉淀标记：
- 格式：在对应记忆条目后追加 `→ [[知识库笔记名]]` 双链
- 防止下次扫描重复推荐已沉淀的记忆

### 11. 报告结果

输出沉淀报告：
- 列出本次处理了多少项目、多少记忆文件
- 列出用户选择了哪些、跳过了哪些
- 列出新建了哪些笔记、合并了哪些笔记
- 列出更新了哪些索引文件

## 经验检索模式

> 触发：用户输入"检索记忆"、"搜索跨项目经验"、"查踩坑记录"、"有没有类似bug"等查询意图时，进入此模式。

### 检索流程

**1. 解析查询意图**

从用户输入中提取：
- 关键词（如 "参数不继承"、"Cookie封禁"、"Mermaid渲染"）
- 分类范围（如不指定则搜索全部：通用经验/项目记忆/反馈偏好/Skill设计）
- 时间范围（如 "最近一周"——可选，默认不限）

**2. 搜索记忆中枢**

使用 Grep 在 `{vault_path}/03_Knowledge/记忆中枢/` 下搜索：
- 文件名匹配
- 正文关键词匹配
- tags 匹配
- synopsis 匹配

**3. 追溯来源**

命中后读取文件 frontmatter，提取：
- `source_projects`：哪些项目产生过此经验
- `source_memory`：原始 memory-hub/ 文件路径（可溯源到具体踩坑记录）
- `bridge_sync`：最后同步时间

**4. 输出检索结果**

```
## 🔍 检索结果：「{查询词}」

| # | 笔记标题 | 分类 | 来源项目 | 最后同步 | 匹配度 |
|---|---------|------|---------|---------|--------|
| 1 | Agent CLI tooling lessons | 通用经验 | AI Worker Hub, PRD项目 | 2026-06-08 | 🟢 高 |
| 2 | OpenCLI浏览器自动化与Boss直聘踩坑 | 通用经验 | Boss Assistant | 2026-06-08 | 🟡 中 |

### 关键发现摘要
- ...
### 相关项目
- AI Worker Hub → [[AI-Worker-Hub项目]]
- 原始记忆文件：memory-hub/lessons/claude-code-param-loss.md
```

**5. 可选：打开来源追溯**

用户要求查看原始记忆文件时，用 Read 读取 `source_memory` 指向的 `memory-hub/` 文件，展示原始踩坑上下文。

---

## 注意事项

- 运行环境：可在任意项目中触发——所有文件操作使用 vault_path 配置的绝对路径，不依赖当前工作目录
- 权限：读取其他项目 `memory-hub/` 通过 Bash cat 命令
- 安全：去敏化步骤强制执行，发现敏感信息时脱敏处理
- 操作记录：完成后追加到 `08_Reports/AI操作日志.md`
- 配置持久化：自动探测到的项目列表应提示用户固化到配置文件

## 首次运行特殊处理

首次运行时，所有项目 memory 文件都应处理（无论是否标注 bridge:true），因为这是初始化沉淀。候选列表展示后仍需用户确认——首次运行不等于自动全量写入。

## Codex Adapter Note

This skill lives under `codex/skills` as a Codex staging adaptation. Project memory should use local `<project>/memory-hub`; cross-project long-term knowledge should be curated into `E:\个人仓库\03_Knowledge\记忆中枢`; config-system protocol lives in `E:\claude-config-master\memory-hub`.