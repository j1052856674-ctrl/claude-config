# 记忆文件格式规范

> 本文件是全局 CLAUDE.md 记忆管理行为约束（原第十四节）的详细规格，从 CLAUDE.md 提取以节省上下文。
> CLAUDE.md 中只保留行为约束，具体格式要求见本文件。
> 版本：v1.0 / 2026-06-11

## 一、目录结构

`.claude/memory/` 下按类型分子目录：

| 子目录 | metadata.type | 存放内容 |
|--------|--------------|---------|
| `lessons/` | `feedback` | 踩坑/bugfix/用户反馈 |
| `decisions/` | `project` | 技术决策/设计选择 |
| `status/` | `project` | 项目状态/计划/里程碑 |
| `reviews/` | `review` | 评审框架/质量标准 |
| `refs/` | `reference` | 外部参考/工具配置 |
| `arch/` | *(同 project)* | 架构子图 |
| `_archive/` | *(任意)* | 已淘汰记忆 |

**强制**：首次创建 `.claude/memory/` 时必须预建全部 7 个子目录（即使是空目录）。禁止按需创建导致文件散放根目录。

**例外**：`MEMORY.md` 和 `architecture-map.md` 可放根目录。

## 二、文件格式

### Frontmatter 必须字段

```yaml
---
name: <同文件名无扩展名>
description: <≤50字>
metadata:
  type: project | feedback | reference | review   # 禁止项目自定义
  created: YYYY-MM-DD
  updated: YYYY-MM-DD
  bridge: true | false
---
```

**禁止创建无 frontmatter 的记忆文件。**

### 可选字段

- `related`：双链关联，如 `[[other-memory-name]]`
- `supersedes`：合并时记录被取代的旧文件名

### 废弃字段（禁止使用）

- `node_type`、`originSessionId`、`date`（与 `created` 重叠）

## 三、长度限制

- 任何记忆文件不超过 **200 行**
- `architecture-map.md`（架构总图）不超过 **150 行**
- `reviews/` 下评审框架允许 200 行，超限也需评估拆分

**超限时压缩优先级**：删除过程细节保留结论 > 模块拆分 > 折叠已完成内容。

## 四、合并规则

同目录 + 同主题的记忆必须合并到已有文件，禁止创建 v2 后缀版本文件。

合并时旧文件的 `name` 写入新文件的 `supersedes` 字段。

## 五、索引管理

`MEMORY.md` 索引条目不超过 **20 条**。超限时淘汰优先级：
1. `_archive/` 中文件直接删除索引
2. `bridge: false` 文件评估淘汰
3. 最久未更新文件归档

路径格式：`- [标题](子目录/文件名.md) — 摘要`

索引文件无 frontmatter，纯 Markdown 列表。

## 六、生命周期

```
写入 → 更新 → 归档 → 淘汰
```

| 阶段 | 操作 |
|------|------|
| 写入 | 新记忆入对应子目录，`bridge` 默认 `true` |
| 更新 | 合并同主题，更新 `updated` 字段 |
| 归档 | 尾部加 `## 归档` 段落，`bridge` 改 `false` |
| 淘汰 | 移入 `_archive/`，从 MEMORY.md 删除索引 |

禁止只有写入没有淘汰。

## 七、bridge 字段

- 新记忆文件 `bridge` 默认为 `true`
- 仅在明确判断"无跨项目复用价值"时设 `false`
- 缺失 `bridge` 字段等同于 `true`（仅 `MEMORY.md` 索引文件允许缺失）

## 八、写入检查清单

每次写入记忆文件前必须依次执行：
1. type 确定 → 子目录映射
2. 主题查重（同目录搜索合并）
3. frontmatter 齐全检查
4. 长度预估
5. 索引更新
6. 上限检查（≥20 条则淘汰低价值条目）

禁止跳过检查清单直接写入。

## 九、memory-bridge 兼容

memory-bridge 拉取记忆时必须递归读取所有子目录（含 `_archive/`），自动跳过 `bridge: false` 和 `_archive/` 中的文件。路径从 `文件名.md` 适配为 `子目录/文件名.md`。
