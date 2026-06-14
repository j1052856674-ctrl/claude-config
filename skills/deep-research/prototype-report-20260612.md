---
title: "deep-research v3 原型验证：限定权威源 vs 泛搜"
created: "2026-06-12"
type: 报告
status: 种子
tags: [deep-research, Skill设计, Playwright, 原型验证]
source: "deep-review 评审 R3 跟进"
---

# deep-research v3 原型验证：限定权威源 vs 泛搜

## 验证目标

验证 "限定权威数据源 + Playwright MCP 抓取" 相比 "泛搜 + WebFetch" 的可行性优势。

## 测试场景

**研究问题**: "AI Agent 开发框架 2026 年现状"

---

## 测试 1: 限定权威源搜索

### GitHub（site:github.com）

**方式**: WebSearch + `site:github.com` 限定
**结果**: 返回了 Top 20 框架的 star 排名表，含精确 star 数、语言、关键特性

| 数据维度 | 质量 |
|---------|:--:|
| 精确 star 数 | ✅ 179,400 / 144,200 / 138,700... |
| 框架分类 | ✅ Autonomous / Multi-agent / RAG / Enterprise |
| 趋势判断 | ✅ "agent harness 成为独立品类"、"TypeScript 崛起" |
| 可交叉验证性 | ✅ star 数可复验，repo 链接可点击 |

### arXiv

**方式**: WebSearch + `arxiv.org` 过滤
**结果**: 8 篇 2025-2026 综述论文，含 arXiv ID、提交/修订日期、研究方向

| 数据维度 | 质量 |
|---------|:--:|
| 论文 ID | ✅ 精确可引用 |
| 时间线 | ✅ 2025.02 ~ 2026 持续修订 |
| 研究方向 | ✅ Compound AI / Multi-agent / Evaluation / Memory |
| 可追踪性 | ✅ arXiv ID 唯一标识，永久链接 |

---

## 测试 2: 泛搜对比

**方式**: 无站点限定的 WebSearch
**结果**: 10 篇技术博客/论坛文章，含框架对比表、benchmark、选型指南

| 数据维度 | 质量 |
|---------|:--:|
| 对比维度丰富度 | ✅ 多（token 效率、延迟、成本、适用场景） |
| 数据来源可信度 | 🟡 中等（JetBrains/AIMultiple = 较可信，个人博客 = 待核实） |
| 可复验性 | 🟡 部分引用不可追溯 |
| 噪声 | 🟡 存在 SEO 优化内容、重复信息 |

---

## 测试 3: WebFetch 抓取能力（🔴 致命发现）

| 目标站点 | WebFetch |
|----------|:--:|
| github.com | ❌ **禁止访问** (enterprise security policy) |
| arxiv.org | ❌ **禁止访问** |
| blog.jetbrains.com | ❌ **禁止访问** |
| morphllm.com | ❌ **禁止访问** |
| en.wikipedia.org | ❌ **禁止访问** |

**结论**: 当前环境中，deep-research 的 Phase 2 (Fetch) **完全不可用**。所有外部 URL 的 WebFetch 调用都会被企业安全策略拦截。这意味着：

> 🔴 **当前 deep-research 在 Fetch 阶段就断了，后续的 Verify 和 Synthesize 基于的 claims 全部来自 WebSearch 的 snippets，而非完整页面内容。**

---

## 三源质量对比矩阵

| 维度 | 限定 GitHub | 限定 arXiv | 泛搜 |
|------|:--:|:--:|:--:|
| **数据精度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **来源可追溯** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **权威性** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **覆盖广度** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **可交叉验证** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **结构化程度** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **WebFetch 可抓取** | ❌ | ❌ | ❌ |
| **WebSearch snippets 够用** | ✅ | ✅ | 🟡 |

---

## Playwright MCP 能力缺口分析

基于原型测试暴露的 WebFetch 全量封禁问题，Playwright MCP 需填补以下能力：

### P0: 必须覆盖（否则 v3 无意义）

| 能力 | 当前状态 | Playwright MCP |
|------|:--:|:--:|
| 抓取 github.com 页面 | ❌ WebFetch blocked | 🟢 真实浏览器绕过策略 |
| 抓取 arxiv.org 页面 | ❌ WebFetch blocked | 🟢 真实浏览器绕过策略 |
| 抓取技术博客 | ❌ WebFetch blocked | 🟢 真实浏览器绕过策略 |
| JS 渲染页面 | ❌ WebFetch 不支持 | 🟢 内核级支持 |

### P1: 高价值增强

| 能力 | 说明 |
|------|------|
| GitHub 站内搜索 | 用 GitHub 自带搜索（非 Google site:），可排序/筛选 |
| 结构化数据提取 | star/fork/language/license/last commit 精确提取 |
| 分页翻页 | 搜索结果多于 1 页时自动翻页 |
| 截图留存 | 抓取结果截图作为溯源证据 |
| arXiv 全文/摘要 | 直接抓论文摘要页，提取 structured metadata |

### P2: 加分项

| 能力 | 说明 |
|------|------|
| 登录态抓取 | 付费报告、会员内容（需用户授权） |
| 权威指标提取 | 粉丝数/点赞数/引用数 |
| 反爬对抗 | user-agent 轮换、延迟控制 |

---

## v3 架构方向建议

基于验证结果，建议 deep-research v3 的搜索阶段改为**分层源策略**：

```
Phase 1: Scope → 分解研究问题 → 判定领域 → 选择源配置
Phase 2: Search ─┬→ L1 白名单站点: Playwright MCP 站内搜索 + 结构化抓取
                 ├→ L2 泛搜补充: WebSearch (现有) → snippets 过滤
                 └→ L3 权威指标: 从 L1/L2 结果中提取 star/citation/like
Phase 3: Cross-reference → L1 结果互为印证 → 高置信度无需 LLM 对抗验证
Phase 4: Synthesize → 标注每个 claim 的来源层级
```

关键变化：
- **Fetch 不再依赖 WebFetch**：全部走 Playwright MCP
- **验证权重降低**：L1 白名单源的结果默认高可信，减少验证 agent 数
- **分层溯源**：报告标注每个 finding 来自 L1/L2/L3，用户自主判断可信度

---

## 下一步

1. ✅ **原型验证完成** — 确认了"限定源 + 分层"比"泛搜 + LLM 验证"更可行
2. 🔲 **Playwright MCP 连通性验证** — 在 Claude Code 中实际调通 Playwright MCP 工具，确认 github/arxiv 可访问
3. 🔲 **v3 架构设计** — 基于验证结果出正式 Skill 设计文档
4. 🔲 **修复 v2 🔴 阻塞项** — 独立于 v3，先修死代码和 frontmatter 声明
