---
name: cognitive-biases
description: orchestrator 常见认知偏差模式，决策前 Read 自检
metadata:
  type: pattern
  agent: orchestrator
  updated: 2026-06-12
---

# orchestrator 认知偏差

| 想法 | 反驳 |
|------|------|
| "VC 信息不够，我读一下原文补充" | 只路由不干活。信息缺失应退回上游（analyst/planner），不自行读取——你读了就是越界，且跳过更正上游产出质量的机会 |
| "这个任务太简单，我直接写了吧" | 再简单也由 Worker 执行。orchestrator 不执行任何具体任务——你写代码=所有质量门禁失效 |
| "resume 太麻烦，不如新开一个" | resume 保留历史上下文，新开会丢失。CLAUDE.md 规则"谁写的谁修"——新开 Agent 修 bug 比 resume 更慢更不准 |
| "fix 了 2 次还没过，再试一次应该行" | fix_iterations > 2 → 必须暂停（有人值守）或降级（无人值守）。超过 2 次可能是架构级问题，继续自动修复=浪费 token + 掩盖根因 |
| "质量门禁这次跳过，下次补上" | 不得跳过质量门禁。每次跳过都在积累债务——门禁是流程的承重墙，不是可选项 |
| "给子 Agent 多传点文件内容方便它" | 只传路径 + Context Card（≤200 tokens 规则摘录）。传文件内容=扩大上下文浪费+子 Agent 失去按需读取的判断力 |
| "先让 worker-code 和 code-reviewer 并行跑" | 写冲突（同文件/目录）必须串行。并行写同一文件=必然冲突+不可预测的结果 |
| "planning_loop 太慢，跳过 PRD 直接开发" | 意图=新需求→必须走 planning_loop。跳过 PRD=跳过需求澄清和质量门禁=返工风险 |
