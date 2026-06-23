# Claude/Codex Config — 统一配置同步仓库

> Claude Code 与 Codex 配置资产的版本化管理仓库。
> 根目录资产服务 Claude Code，`codex/` 是 Codex 专用 staging/install 源，`memory-hub/` 记录本同步项目的 UAM 协议、迁移状态与决策。
> 多机一键部署，本地迭代 → 推送 GitHub → 所有机器同步。

## 设计原则

**仓库是配置源，runtime 目录是部署目标。** `~/.claude/` 与 `~/.codex/` 只作为安装/适配/缓存位置；具体项目事实写各项目本地 `memory-hub/`，长期可复用知识由 memory-bridge 沉淀到 `E:\个人仓库\03_Knowledge\记忆中枢\`。

## 目录结构

```
claude-config/
├── CLAUDE.md                    # Claude Code 全局/项目协作准则
├── memory-hub/                  # 本同步项目的 UAM 协议、迁移状态与决策
├── codex/                       # Codex 专用 staging/install 源
├── sync.sh                      # Claude Code 双向同步脚本（bash，跨平台零依赖）
├── sync-config.example.json     # Claude 同步配置模板（提交 git）
├── sync-config.json             # 每台机自己的 Claude 配置（gitignore）
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
├── skills/                      # 19 个自建 Skill
│   ├── deep-review/             # 深度评审（四阶段）
│   ├── prd-v3/                  # PRD 生成 v3
│   ├── frontend/                # 前端生成 v3
│   ├── sync-agent-config/       # Claude/Codex 配置同步工作流
│   ├── ...（共 19 个）
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
| `bash sync.sh status` / `.\sync.ps1 status` | 查看同步状态（dry-run） |
| `bash sync.sh deploy` / `.\sync.ps1 deploy` | 仓库 → `~/.claude/` |
| `bash sync.sh collect` | `~/.claude/` → 仓库（PowerShell 版暂不提供 collect，避免误覆盖源仓库） |

## 统计

| 类别 | 数量 |
|------|------|
| Agent 定义 | 7 |
| Agent 知识库文件 | ~18 |
| Skill | 19 |
| 系统记忆 | 2 |

## 维护

- 修改 Skill/Agent 后 → `bash sync.sh collect` → commit & push
- 新机器首次 → clone → 改 `sync-config.json` → `bash sync.sh deploy`
- 废弃 Skill 直接从仓库删除，`bash sync.sh deploy` 会自动同步到 `~/.claude/`

## Claude / Codex 双端维护

本仓库有两套运行源：

| 范围 | Claude 源 | Codex 源 | 说明 |
|---|---|---|---|
| 全局规则 | `CLAUDE.md` | `codex/AGENTS.md` | 行为规则需保持语义一致，平台差异只写适配说明 |
| Skill | `skills/<skill>/` | `codex/skills/<skill>/` | 共享能力修改后必须同步两侧；Codex 侧可保留 adapter note |
| Agent | `agents/` | `codex/prompts/agents/` | Claude agent 定义变更后，同步生成或手动更新 Codex prompt |
| 记忆协议 | `memory-hub/` | 共用根 `memory-hub/` | 不在 `codex/` 下复制协议，Codex/Claude 都引用根协议 |

维护规则：

1. 改共享 Skill 时，先改 Claude 源 `skills/<skill>/`，再同步到 `codex/skills/<skill>/` 并处理 Codex 专属说明。
2. 改 Codex 专属触发、工具或路径时，只改 `codex/skills/<skill>/`，并在提交说明中标注是 Codex adapter 差异。
3. 改全局行为规则时，同时检查 `CLAUDE.md` 与 `codex/AGENTS.md` 是否需要同步。
4. 改记忆沉淀规则时，以 `memory-hub/MEMORY-SPEC.md` 为权威源，再同步 `CLAUDE.md`、`codex/AGENTS.md`、相关 Skill。
5. 部署 Claude 运行态：Windows PowerShell 用 `.\sync.ps1 deploy`，bash/WSL/Git Bash 用 `bash sync.sh deploy`。
6. 部署 Codex 运行态：PowerShell 用 `.\codex\sync-codex.ps1 deploy`，bash 用 `bash codex/sync-codex.sh deploy`。
7. 不直接手改 `~/.claude` / `~/.codex` 里的长期规则；如果运行态先改了，立刻 collect 或回写到本仓库源文件。

---

🤖 维护者: fan · 2026-06-14

## Universal Agent Memory

This repository now contains `memory-hub/`, the protocol/config hub for the layered Universal Agent Memory model shared by Claude and Codex.

- Project facts authority: each project's local `<project>/memory-hub/`
- Config/protocol hub: `E:\claude-config\memory-hub\`
- Long-term reusable knowledge: `E:\个人仓库\03_Knowledge\记忆中枢\`
- Short index: `memory-hub/MEMORY.md`
- Protocol: `memory-hub/MEMORY-SPEC.md`
- Routing manifest: `memory-hub/manifests/active.json`
- Legacy Claude memory folders remain import sources unless a project explicitly overrides them.
- Do not commit credentials, local runtime state, history, daemon files, or `settings.local.json` into shared memory.

Before resetting or force-updating GitHub, review local changes with `git status` and `git diff`.
