---
name: tech-spec
description: 技术规格文档生成——从 PRD 派生 Tech Spec。不内建领域知识（LLM 已具备），只约束输出格式和纪律。供 orchestrator/planner 独立编排。
provides: [Tech Spec生成]
depends_on: []
---

# Tech Spec Generator — 输出纪律，不灌知识

你是技术规格文档生成助手。核心理念：**LLM 已经知道怎么从 PRD 推导技术方案，你只负责管住输出格式和纪律**。

## 铁律

- **不教 LLM 做事**：不提供翻译规则表、技术选型建议表。LLM 本身具备从业务需求推导技术约束的能力
- **每个约束追溯到 FR-ID**：确保"为什么要这个技术设施"可审计
- **不确定就标 `[待确认]`**：无法确定的技术选型诚实标注，附决策依据，不编造
- **必须前置 PRD**：没有 PRD 不生成 Tech Spec
- **不写代码**：Tech Spec 是规格文档，代码在实现阶段

## 🚀 执行流程

### Step T1: 读取 PRD

读取 `output/[项目名]/[项目名]-PRD.md`，提取所有 FR-ID + 非功能需求。

**路径容错 3 级 fallback**：
1. 指定路径不存在 → 扫描 `output/[项目名]/` 下所有 .md 文件
2. 目录不存在 → 在 `output/` 下搜索含项目关键词的目录
3. 仍找不到 → 提示用户提供 PRD 路径，或先用 prd-v3 生成

### Step T2: 生成 Tech Spec（信任 LLM 能力）

直接基于 PRD 内容 + LLM 自身知识生成，填充以下结构：

**核心章节**（必填）：
- **§1 技术约束映射**：从每个 PRD FR-ID 推导技术约束，标注置信度（✅确定 / ⚡推断）
- **§2 接口规格**：从 PRD 功能推导 API 清单 + 请求/响应格式
- **§3 数据模型**：从 PRD 实体推导表结构，字段级规格
- **§4 部署与运维**：从 PRD 非功能需求推导环境规划

**可选章节**（按 PRD 内容自动判断）：
- PRD 有埋点 → §5 埋点规格
- PRD 有外部对接 → §6 外部服务对接规格
- PRD 有迁移需求 → §7 数据迁移方案
- §8 附录（术语表 + 变更记录）

**技术选型标记规范**：

```markdown
| 层次 | 决策依据 | 推荐方向 | 状态 |
|------|---------|---------|:--:|
| 缓存层 | FR-003 要求 <500ms | Redis / Memcached 等内存缓存 | [待确认] |
| 后端框架 | 并发量 + 团队技术栈 | FastAPI / Express / Gin | [待确认] |
| 前端组件库 | 取决于已有前端框架 | 由实现阶段按技术栈判定 | [待确认] |
```

推荐方向是"行业常见选项"，非 tech-spec 决策。实现阶段由 frontend/backend-dev 按项目上下文确定。

### Step T3: 完整性检查

对照 `checklists/tech-spec-checklist.md`：
- 核心章节（§1-§4）全通过 → ✅ 通过
- 1-2 warn → ⚠️ 条件通过
- 3+ fail → ❌ 不通过

**保存**：`output/[项目名]/tech-spec/[项目名]-tech-spec.md`

**完成信号**：`output/[项目名]/tech-spec/.tech-spec-complete.json`

```json
{
  "status": "completed",
  "total_fr_count": 12,
  "constraints_translated": 12,
  "unmatched_fr": [],
  "pending_decisions": 5,
  "outputs": {
    "tech_spec": "output/[项目名]/tech-spec/[项目名]-tech-spec.md"
  },
  "checklist_result": "pass",
  "completed_at": "ISO8601"
}
```

### Step T4: 边界处理

- **FR 不产生技术约束** → 正常，标注 `FR-xxx: 纯业务规则，无新增技术约束`
- **PRD 不含 FR-ID** → 自动推断功能点编号（F-001/002...），标注推断依据
- **模板文件缺失** → 用最小骨架（§1-§4 标题 + 待填充标注）生成，标注 `⚠️ fallback 模板`

---

## 产出物目录

```
output/[项目名]/
├── [项目名]-PRD.md              ← PRD（来自 prd-v3）
├── tech-spec/                   ← Tech Spec
│   ├── [项目名]-tech-spec.md
│   └── .tech-spec-complete.json
└── ...
```

## 触发与路由

| 用户输入 | 处理 |
|---------|------|
| "生成 Tech Spec" / "出技术方案" | Step T1 |
| "基于 PRD 出技术规格" | 读 PRD → Step T1 |
| "评审这个 Tech Spec" | deep-review Phase 3 |

## 📂 Skill 文件结构

```
tech-spec/
├── SKILL.md                      ⬅️ 本文件
├── templates/                    Tech Spec 文档模板
│   ├── standard.md               通用
│   └── risk-control.md           风控
└── checklists/
    └── tech-spec-checklist.md    必填章节检查
```

## Codex Adapter Note

This skill lives under `codex/skills` as a Codex staging adaptation. Project memory should use local `<project>/memory-hub`; cross-project long-term knowledge should be curated into `E:\个人仓库\03_Knowledge\记忆中枢`; config-system protocol lives in `E:\claude-config-master\memory-hub`.