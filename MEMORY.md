# Global Memory Index

> 本文件是全局事实层，所有项目自动读取（零权限）。
> 与 CLAUDE.md（规则层）分离：CLAUDE.md 定义行为约束，MEMORY.md 记录已知事实。
> 一句话摘要覆盖大部分场景，需要完整详情时按指针读取日常仓库。

## 用户偏好
- fan 喜欢可视化输出（图表、对比表、结构图等），偏好丰富直观的呈现方式
- 开发由 AI 完成，技术栈选择不受团队技能限制，优先选择最佳技术方案
- 字段命名不带角色前缀（"fan反馈"统一改为"反馈"）
- （更多偏好规则见 ~/.claude/CLAUDE.md 第十二节）

## 跨项目踩坑（一句话摘要）
- Claude Code Agent/Bash 连续调用时必需参数不继承 → 详情: 日常仓库/03_Knowledge/记忆中枢/通用经验/Claude-Code工具踩坑.md
- 过度分析倾向：先执行再自检，而非先分析再执行 → 详情: 日常仓库/03_Knowledge/记忆中枢/通用经验/Claude-Code工具踩坑.md
- 禁止盲目重试：参数微调≠换方法，必须升级诊断层级 → 详情: 日常仓库/03_Knowledge/记忆中枢/通用经验/Claude-Code工具踩坑.md
- Mermaid v10 display:none 语法 bug（反复复发）→ 详情: 日常仓库/03_Knowledge/记忆中枢/项目记忆/PRD项目.md
- drawio C7 自检闭环机制 → 详情: 日常仓库/03_Knowledge/记忆中枢/项目记忆/PRD项目.md
- Windows Tauri Rust 编译需 VS Community → 详情: 日常仓库/03_Knowledge/记忆中枢/项目记忆/AI-Worker-Hub项目.md
- OpenCLI boss search 必须 --site-session persistent + 编码值优先 + 单批≤75条间隔30秒 → 详情: 日常仓库/03_Knowledge/记忆中枢/通用经验/OpenCLI浏览器自动化与Boss直聘踩坑.md

## 项目状态（一句话摘要）
- 工作资产库：审查框架已就绪，7张表+12接口 → 详情: 日常仓库/03_Knowledge/记忆中枢/项目记忆/工作资产库项目.md
- AI Worker Hub：Tauri初始化+前端完成，Rust编译环境待解决，Codex接入计划待执行 → 详情: 日常仓库/03_Knowledge/记忆中枢/项目记忆/AI-Worker-Hub项目.md
- PRD项目：Skill v3设计完成，Ontology平台v2.0+用户洞察Agent已产出，Skill生态重构完成（能力归属矩阵+全局迁移） → 详情: 日常仓库/03_Knowledge/记忆中枢/项目记忆/PRD项目.md
- Skill 能力归属矩阵：每个能力域唯一权威 Skill，编排者不实现原则，provides/depends_on 声明 → 详情: 日常仓库/03_Knowledge/记忆中枢/Skill设计/Skill能力归属矩阵.md
- deep-review 生态新增强：review-fix-verify 子 Skill 上线（修复质量三层验证+2轮上限+人类决策分叉），deep-review 路由中枢已注册 → 详情: 日常仓库/.claude/memory/decisions/review-fix-verify-skill-design.md
- Boss Assistant：Phase1搜索提取Skill已实例化，Phase2投递待启用 → 详情: 日常仓库/03_Knowledge/记忆中枢/项目记忆/Boss-Assistant项目.md

## 系统级资源
- Skill 能力归属矩阵：~/.claude/memory/decisions/skill-capability-ownership.md — 每个能力域的唯一权威 Skill，lifecycle: permanent
- 记忆沉淀协议：项目本地 `<project>/memory-hub/` 为项目事实权威源；详细写入准入、`bridge` 默认 false、review/snapshot/归档规则见 `E:\claude-config\memory-hub\MEMORY-SPEC.md`，项目有自己的 `memory-hub/MEMORY-SPEC.md` 时以项目规范为准

## 记忆体系架构
本文件是三层记忆架构中的"事实层"：

| 层级 | 文件 | 作用 | 权限 | 读取范围 |
|------|------|------|------|----------|
| 规则层 | ~/.claude/CLAUDE.md | 行为约束（必须/禁止） | 全局，零权限 | 所有项目 |
| 事实层 | ~/.claude/MEMORY.md | 本文件。一句话摘要+指针 | 全局，零权限 | 所有项目 |
| 详情层 | 日常仓库/03_Knowledge/记忆中枢/ | 完整内容、双链、frontmatter | 需配Read权限 | 按需 |
| 项目权威层 | 各项目 `<project>/memory-hub/` | 项目事实、状态、决策、踩坑、评审资产 | 项目内，零权限 | 仅本项目 |
| Runtime 适配层 | ~/.claude/、~/.codex/、旧 `.claude/memory/` | 安装目标、缓存、导入源 | 本机运行态 | 按需 |

**记忆流转：**
- 写入：满足准入的项目事实 → `<project>/memory-hub/` → 显式 `bridge: true` 候选 → memory-bridge 精选、去敏、去重、通用化 → 详情层 → 更新本文件
- 读取：先读项目 `memory-hub/MEMORY.md`；跨项目事实再读本文件（一句话摘要）；需详情时按指针读详情层
