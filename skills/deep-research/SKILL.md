---
name: deep-research
description: Deep research harness — fan-out web searches, fetch sources, cross-check claims, synthesize a cited report. Supports depth modes: quick (~15 agents, 10-15min), standard (~25 agents), thorough (~50+ agents).
provides: [深度调研, 多源交叉验证, 结构化研究报告生成]
depends_on:
  - tool: WebSearch
    purpose: 多角度网页搜索
  - tool: WebFetch
    purpose: 抓取网页全文内容（注：v3将替换为Playwright）
  - platform: Workflow
    purpose: agent/parallel/phase/log 编排能力
---

# Deep Research Skill

## When to Use

When the user wants a deep, multi-source, fact-checked research report on any topic. BEFORE invoking, check if the question is specific enough to research directly — if underspecified (e.g., "what car to buy" without budget/use-case/region), ask 2-3 clarifying questions to narrow scope. Then pass the refined question as args, weaving the answers in.

## Depth Modes

Choose based on task type and user intent:

| Mode | Agents | Time | Use When |
|------|--------|------|----------|
| **quick** | ~15-20 | 10-15min | Market research, industry overview, trend analysis — claims are data references, not controversial assertions |
| **standard** | ~25-30 | 20-30min | Policy analysis, competitive intel, moderate-stakes decisions — some claims need verification |
| **thorough** | ~50+ | 45-60min | Academic research, medical/scientific claims, high-stakes decisions — adversarial verification needed |

Default to **quick** for market/industry research, **standard** for policy/business analysis, **thorough** only when user explicitly requests deep verification.

## How to Invoke

```
Workflow({
  name: 'deep-research',
  args: '<research question> | depth: <quick|standard|thorough>'
})
```

The depth parameter is parsed from args string after `| depth:` separator. If omitted, defaults to quick.

## Architecture

The workflow script is parameterized by depth mode:

- **quick**: 1-vote light verification (cross-reference check), MAX_VERIFY=8, batch fetch (5 agents max)
- **standard**: 2-vote verification, MAX_VERIFY=15, individual fetch (10 agents max)
- **thorough**: 3-vote adversarial verification, MAX_VERIFY=25, individual fetch (15 agents max)

All modes share: Scope → Search → Fetch → Verify → Synthesize pipeline structure.

## Optimization Notes (v2 vs v1)

v1 was ported from bug-hunter architecture with 3-vote adversarial verify for ALL claims. This caused:
- ~100 agents for market research tasks
- 1h+ runtime
- Verify stage often stalled/aborted, producing all-abstain results (wasted effort)

v2 optimizations:
1. Depth modes with appropriate verification intensity
2. Batch fetch in quick mode (1 agent fetches multiple URLs)
3. Light cross-reference verify instead of adversarial for data-type claims
4. Reduced MAX_VERIFY from 25 to 8 (quick) / 15 (standard)
5. Stall detection with faster timeout and skip-once (no infinite retries)