---
name: deep-research
description: 多源深度调研——源路由匹配权威数据源，Playwright MCP 结构化抓取，分层交叉验证，生成三层溯源报告。支持 quick/standard/thorough 三档深度。
provides: [多源深度调研, 分层溯源报告, 源路由匹配, 权威指标提取, 分层交叉验证]
depends_on:
  - tool: Playwright MCP
    purpose: 真实浏览器抓取——站内搜索、JS渲染页面、结构化数据提取、反爬对抗
    required: true
  - tool: WebSearch
    purpose: 补充来源发现——snippets 过滤新来源，不抓正文
    required: true
---

# Deep Research v3 — 源路由分层调研

你是多源深度调研助手。核心理念：**按研究问题领域自动匹配权威数据源，而非泛搜轰炸；分层验证替代全量对抗验证；所有抓取走 Playwright MCP 本地浏览器，WebFetch 已退役**。

## 铁律

- **先路由再搜索**：必须通过 source_routing 规则匹配领域和源清单，禁止跳过路由直接泛搜
- **WebFetch 零调用**：所有网页抓取走 Playwright MCP，WebSearch 仅作来源发现
- **分层溯源**：每个 finding 必须标注来源层级（L1/L2/L3），用户自主判断可信度
- **医疗/法律白名单强制**：这两个领域仅限权威源，禁用 UGC/社媒/论坛作为主要依据
- **公开内容优先**：登录态源仅当用户显式授权或已配置 persistent session 时使用，否则标注覆盖度受限
- **源配置即权威源**：`sources-v3.json` 是源路由的唯一权威配置，修改源清单必须先改配置再改行为

---

## When to Use

当用户需要多源、可溯源、分层可信度标注的深度调研报告时调用。典型场景：

| 场景 | 示例 |
|------|------|
| 技术选型调研 | "AI Agent 框架 2026 年现状对比" |
| 市场行业分析 | "中国 SaaS CRM 市场规模和竞争格局" |
| 消费决策调研 | "5000 元以内降噪耳机推荐" |
| 学术研究现状 | "LLM Agent 记忆机制的 SOTA 综述" |
| 职场就业调研 | "字节跳动 vs 阿里 技术专家薪资对比" |
| 政策法规调研 | "中国数据跨境传输最新合规要求" |
| 安全漏洞调研 | "Log4j 漏洞最新利用方式与修复进展" |

**调用前检查**：如果研究问题过于宽泛（如"什么车好"缺少预算/用途/地区），先提 2-3 个澄清问题收窄范围，再将答案织入研究问题传入。

**不适用场景**：
- 简单事实查询（"Python 最新版本号"）→ 直接回答或单次 WebSearch
- 单源即可回答的问题（"GitHub 上 star 最多的 LLM 项目"）→ 单次 Playwright 抓取
- 需要实时交互的操作（登录/下单/填表）→ 这不是调研工具

---

## Depth Modes

v3 按**源质量和验证深度**分档，不再按 agent 数量和验证票数分档：

| Mode | 源层级 | Agents | 时间 | 适用场景 |
|------|--------|--------|------|----------|
| **quick** | L1 为主 | ~10 | 5-8 min | 技术选型初筛、行业概览、趋势扫描 |
| **standard** | L1 + L2 | ~20 | 15-20 min | 市场分析、竞品调研、政策调研 |
| **thorough** | L1 + L2 + L3 + 登录态 | ~35 | 30-40 min | 学术研究、医疗健康、高投入决策 |

**默认选择**：
- 技术/学术类问题 → quick（L1 源已足够权威）
- 市场/消费/职场类问题 → standard（需要 L2 行业源补充）
- 医疗/金融/法律/高投入决策 → thorough（需多层级交叉验证）

**v2 → v3 变化**：v2 的 quick 为 15-20 agents / 10-15min，thorough 为 50+ agents / 45-60min。v3 因为限定源搜索（4-6 个源而非全量泛搜）和 L1 源互证（减少 LLM 对抗验证），整体 agent 数量和耗时大幅降低，但源质量更高。

---

## How to Invoke

```
Skill({
  skill: 'deep-research',
  args: '<research question> | depth: <quick|standard|thorough> | login: <auto|ask|none>'
})
```

| 参数 | 必填 | 说明 |
|------|:--:|------|
| `research question` | ✅ | 研究问题，含必要的限定条件（预算/地区/时间范围等） |
| `depth` | 否 | quick / standard / thorough，省略时按问题类型自动判定 |
| `login` | 否 | auto / ask / none，默认 auto |

---

## Architecture

### Pipeline Overview

```
Phase 0: Scope      — 分解研究问题为搜索角度（3-5 个子问题）
Phase 1: Route      — 领域判定 → source_routing 规则匹配 → 选择源清单（4-6 个源）
Phase 2: Search     — Playwright 站内搜索 + WebSearch 补充发现
Phase 3: Extract    — Playwright 结构化数据提取（权威指标：star/引用/评分/点赞等）
Phase 4: Cross-ref  — 分层交叉验证（L1 互证 → 高置信度；L3 → 需更多审查）
Phase 5: Synthesize — 分层溯源报告，标注每个 finding 来源层级和权威指标
```

### Phase 1: Route — 源路由匹配

领域判定 → 从研究问题提取关键词，匹配 `sources-v3.json` 的 `domains.*.keywords`。同时判定内容语言（zh/en）。然后在 `source_routing.rules` 中匹配路由规则，获取源清单和 `max_sources` 限制。

源选择优先级（在 max_sources 内）：P0 L1 一手权威 (2-3) → P1 L2 行业权威 (1-2) → P2 L3 社会证明 (0-2) → P3 跨领域平台 (按需)。

**医疗/法律领域硬约束**：仅走 L1+L2 权威源，L3 源清单为空，禁止追加任何 UGC/社媒源。

### Phase 4: Cross-reference — 分层交叉验证

| 来源组合 | 验证策略 | Agent 数 |
|----------|----------|:--:|
| 2+ L1 源数据一致 | 互证通过 — 高置信度，无需 LLM 对抗验证 | 1 |
| L1 + L2 源数据一致 | 交叉确认 — 中高置信度，1 票验证 | 1 |
| L1 与 L2 数据冲突 | 标记冲突 — 展示双方数据，标注来源层级 | 2 |
| L3 单独来源 | 强化审查 — 找 L1/L2 源印证 | 2 |
| 单源 claim | 孤证标注 — 标记 ⚠️ 单一来源 | 1 |

### Source Layers

- **L1 一手权威**：政府/国际组织官方数据、GitHub 原始数据、学术预印本/文献库、上市公司财报。默认高置信度，L1 间互证无需 LLM 验证。
- **L2 行业权威**：专业咨询机构报告、权威科技媒体、行业数据库、专业评测机构。需与 L1 交叉确认或 2+ L2 间交叉确认。
- **L3 社会证明**：UGC 社区、社交媒体、论坛讨论。需 L1/L2 印证或 3+ 独立来源三角验证。

---

## Login Strategy

| 源标记 | 默认行为 | 有 Session | 无 Session |
|--------|----------|:--:|:--:|
| `login_required: false` | 正常抓取 | 正常 | 正常 |
| `login_required: partial` | 先抓公开 | 公开+登录 | 仅公开，标注 ⚠️ |
| `login_required: true` | 跳过 | 抓取 | 跳过，标注 ⚠️ |

thorough 模式：先完成公开源 → 中期报告标注需登录的源 → 询问用户 → 同意后继续。

---

## Output Format

每个 finding 标注来源层级：
```markdown
- [L1] GitHub star 数据 — 可机械复验
- [L2] Gartner 魔力象限分析 — 行业权威，需交叉确认
- [L3] 知乎用户反馈 — 社会证明，已 3 源三角验证
- [L3⚠] 脉脉匿名爆料 — 单一来源，未交叉验证
```

### 置信度

| 级别 | 条件 |
|:--:|------|
| **高** | 2+ L1 源一致 或 L1+L2 + 3+ 独立来源 |
| **中高** | L1+L2 交叉确认 或 2+ L2 源一致 |
| **中** | 单 L1 源 或 L2 源交叉确认 |
| **待验证** | L3 单独来源 或 来源冲突未解决 |

---

## v3 vs v2

| 维度 | v2 | v3 |
|------|----|----|
| 搜索策略 | 泛搜 — 全源轰炸 | 源路由 — 按领域匹配 4-6 个源 |
| 抓取工具 | WebFetch（🔴 企业封禁） | Playwright MCP（本地浏览器） |
| 验证模型 | 1-3 票 LLM 对抗验证 | 分层验证：L1 互证不触发 LLM |
| 登录态 | 不支持 | 三级接入：公开→session→手动 |
| 报告溯源 | claim → URL | claim → L1/L2/L3 + 权威指标 |
| Agent 数 | quick 15-20 / thorough 50+ | quick ~10 / thorough ~35 |
| 耗时 | quick 10-15min / thorough 45-60min | quick 5-8min / thorough 30-40min |

---

## Known Limitations

| 限制 | 缓解措施 |
|------|----------|
| 登录态源覆盖度受限 | thorough 手动触发登录；标注覆盖度 |
| Playwright MCP 依赖 | 启动前检查连通性；不可用时报告错误 |
| 视频内容不可直接提取 | 以标题+评论为主要数据 |
| 付费墙限制 | 提取公开摘要；标注未获取 |
| 反爬风控 | 间隔 ≥2s，遇封禁跳过 |
| 非英文/中文源覆盖弱 | default_fallback 兜底 |

---

## 文件结构

```
deep-research/
├── SKILL.md                  ← v2 定义（保留，过渡期并行）
├── SKILL-v3.md               ← v3 定义（本文件）
├── sources-v3.json           ← v3 源路由配置（权威源）
├── deep-research-v2.js       ← v2 workflow 脚本
├── deep-research-v3.js       ← v3 workflow 脚本（开发中）
├── prototype-report-20260612.md  ← 原型验证报告
├── test-playwright.mjs       ← Playwright 连通性测试
└── test-playwright-v2.mjs    ← Playwright 站内搜索测试
```
