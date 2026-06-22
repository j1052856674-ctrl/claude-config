# 记忆沉淀规范 v2.0

> 本文件是部署到 `~/.claude/memory/MEMORY-SPEC.md` 的 Claude 运行态规范副本。
> 权威协议源为仓库 `memory-hub/MEMORY-SPEC.md`；若项目存在 `<project>/memory-hub/MEMORY-SPEC.md`，以项目规范为准。

## 一、权威层级

| 层级 | 位置 | 作用 |
|---|---|---|
| 项目权威层 | `<project>/memory-hub/` | 项目事实、状态、决策、踩坑、评审资产 |
| Runtime 适配层 | `~/.claude/`、`~/.codex/`、旧 `.claude/memory/` | 安装目标、缓存、导入源 |
| 长期知识库 | `E:\个人仓库\03_Knowledge\记忆中枢\` | 跨项目复用知识，经 memory-bridge 精选沉淀 |
| 配置协议层 | `E:\claude-config\memory-hub/` | Claude/Codex 配置协议、迁移状态、系统级决策 |

项目工作优先读写项目本地 `memory-hub/`。不要把项目事实长期写入 runtime 目录。

## 二、Hot / Warm / Cold 分层

| 层级 | 位置 | 用途 | 默认读取 |
|---|---|---|---|
| Hot | `MEMORY.md` | 新 session 启动入口，只放仍有效的核心指针 | 是 |
| Warm | `arch/`、`status/`、`decisions/`、`lessons/`、`reviews/`、`refs/`、`conflicts/` | 任务相关详情资产 | 否 |
| Cold | `_archive/` | 过期、被替代、低频历史资产 | 否 |

## 三、写入准入

只在信息会影响未来工作时写入记忆。

必须写入：

- 不可逆或高成本决策，例如架构边界、权威事实源、对象粒度、能力归属。
- 重复踩坑或高返工风险经验。
- 当前阻塞项、阶段切换、已确认的业务/技术口径。
- 会影响后续 Agent 路由、Skill 调用、验证或构建的规则。

可以写入但默认不进 `MEMORY.md`：

- 普通评审报告。
- 一次性方案比较。
- 阶段性快照。
- 工具运行记录和验证摘要。

不要写入：

- Git/file-change 流水、临时命令输出、原始对话摘录。
- 未采纳的想法、临时推测、普通 brainstorm 残留。
- 可从源文件直接读取的目录、函数、配置清单。
- API Key、密码、令牌、私钥、个人隐私、本地 runtime 状态、history、daemon、cache、SQLite、`settings.local`。

## 四、目录结构

项目 `memory-hub/` 推荐结构：

- `MEMORY.md`：项目短索引。
- `MEMORY-SPEC.md`：项目特有记忆规范。
- `decisions/`：决策、政策、架构选择。
- `lessons/`：重复踩坑、修复、反馈、操作经验。
- `status/`：状态、计划、里程碑。
- `reviews/`：评审报告和持久评审发现。
- `refs/`：外部参考和工具说明。
- `conflicts/`：未解决记忆冲突。
- `_archive/`：废弃或归档记忆。
- `manifests/`：机器可读索引，按需创建。

禁止在根目录散放详情文件。根目录通常只放 `MEMORY.md`、`MEMORY-SPEC.md` 和极少数历史入口。

## 五、Frontmatter

完整 UAM 详情文件建议使用：

```yaml
---
id: mem-YYYYMMDD-short-name
title: Human readable title
type: decision | lesson | status | ref | review | conflict | governance
scope: project | global | skill | tool
status: active | draft | deprecated | conflict | archived
source: human | claude | codex | import | mixed
agents: [claude, codex]
created: YYYY-MM-DD
updated: YYYY-MM-DD
bridge: false
supersedes: []
conflicts_with: []
completeness: complete | partial | stale
confidence: high | medium | low
needs_review: false
token_policy: index-only | selective-read | full-read-on-demand
---
```

项目轻量文件可简化，但必须包含 `name` 或 `id`、`type`、`created`、显式 `bridge`。

## 六、`bridge` 规则

- `bridge: false` 是默认值。
- 新记录缺失 `bridge` 时按 `false` 处理。
- `bridge: true` 只表示可作为长期知识库候选，不代表自动提升。
- 只有同时满足以下条件才设 `bridge: true`：
  1. 已抽象成跨项目可复用的方法、原则或反模式。
  2. 不依赖项目私有表名、字段名、路径、凭据或本地状态。
  3. 对未来项目有明确复用价值。

项目状态、普通 review、一次性 snapshot、路径修复、工具运行日志默认 `bridge: false`。

## 七、索引规则

- 项目 `MEMORY.md` 只保留启动必读指针，建议不超过 20 条。
- 优先放分类入口，而不是逐条列出所有历史资产。
- 新 review 不默认进 `MEMORY.md`。
- `superseded`、`archived`、`resolved`、`stale` 记录不应留在热索引。

## 八、评审与快照

- L1/light review：优先在对话中输出，不写 memory，除非用户要求或发现 P0/P1 长期风险。
- L2/L3/deep review：写入 `reviews/`，默认 `bridge: false`。
- 同一对象重复评审：更新已有报告或使用 `supersedes`，避免日期流水。
- `task-snapshot` 默认只输出文本。只有阶段切换、不可逆决策、重复踩坑、权威源变化或用户明确要求时才写入记忆。
- snapshot 的方法论收获是候选沉淀，不自动为每条新建文件。

## 九、归档规则

归档而非删除：

- 被新决策替代的旧决策。
- 已完成且不再驱动当前工作的 review。
- 旧阶段状态。
- 与当前协议冲突的旧模板或旧规则。

归档位置为 `_archive/`，或设置 `status: archived` 并写明 `superseded_by`。

## 十、写入检查清单

写入前依次检查：

1. 是否满足写入准入。
2. 是否已有同主题记忆可更新。
3. 是否会与现有记忆冲突。
4. 是否包含敏感信息或 runtime 状态。
5. `bridge` 是否显式且符合规则。
6. 是否真的需要进入 `MEMORY.md` 热索引。
