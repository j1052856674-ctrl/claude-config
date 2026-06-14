# Claude Config — 系统配置同步仓库

> Claude Code 全局配置（CLAUDE.md / MEMORY.md / Skills / Agents）的版本化管理仓库。
> 多机一键部署，本地迭代 → 推送 GitHub → 所有机器同步。

## 设计原则

**只放系统级 `~/.claude/` 配置。** 具体项目的产出（PRD、知识库、模板等）放各自独立的仓库管理，不混入本仓库。

## 目录结构

```
claude-config/
├── CLAUDE.md                    # 全局 Agent 协作准则 v1.5
├── MEMORY.md                    # 全局记忆索引
├── sync.sh                      # 双向同步脚本（bash，跨平台零依赖）
├── sync-config.example.json     # 同步配置模板（提交 git）
├── sync-config.json             # 每台机自己的配置（gitignore）
│
├── agents/                      # 7 个 Agent 运行层定义
│   ├── orchestrator.md
│   ├── analyst.md
│   ├── planner.md
│   ├── worker-code.md
│   ├── worker-think.md
│   ├── code-reviewer.md
│   └── contract-validator.md
│
├── agent-knowledge/             # Agent 知识库
│   ├── orchestrator/
│   ├── planner/
│   ├── worker-code/
│   ├── code-reviewer/
│   └── contract-validator/
│
├── skills/                      # 22 个自建 Skill
│   ├── deep-review/             # 深度评审（四阶段）
│   ├── prd-v3/                  # PRD 生成 v3
│   ├── frontend/                # 前端生成 v3
│   ├── ...（共 22 个）
│
├── commands/                    # 自定义命令
│   └── auto-mode.md
│
└── memory/                      # 系统级记忆
    ├── MEMORY-SPEC.md
    └── decisions/
        └── skill-capability-ownership.md
```

## 多机同步

### 初始化（新机器）

```bash
git clone https://github.com/j1052856674-ctrl/claude-config.git
cd claude-config
cp sync-config.example.json sync-config.json   # 编辑机器名
bash sync.sh deploy                              # 部署到 ~/.claude/
```

### 日常操作

```bash
# 本机改完配置后，收集变更 → push
bash sync.sh collect
git add -A && git commit -m "sync: 描述"
git push

# 另一台机 pull → 部署
git pull
bash sync.sh deploy
```

### 命令说明

| 命令 | 作用 |
|------|------|
| `bash sync.sh status` | 查看同步状态（dry-run） |
| `bash sync.sh deploy` | 仓库 → `~/.claude/` |
| `bash sync.sh collect` | `~/.claude/` → 仓库 |

## 统计

| 类别 | 数量 |
|------|------|
| Agent 定义 | 7 |
| Agent 知识库文件 | ~18 |
| Skill | 22 |
| 系统记忆 | 2 |

## 维护

- 修改 Skill/Agent 后 → `sync.py collect` → commit & push
- 新机器首次 → clone → 改 `sync-config.json` → `sync.py deploy`
- 废弃 Skill 直接从仓库删除，`sync.py deploy` 会自动同步到 `~/.claude/`

---

🤖 维护者: fan · 2026-06-14
