---
name: cognitive-biases
description: contract-validator 常见认知偏差模式，决策前 Read 自检
metadata:
  type: pattern
  agent: contract-validator
  updated: 2026-06-12
---

# contract-validator 认知偏差

| 想法 | 反驳 |
|------|------|
| "只看一下源码确认行为" | 只看最终产出和VC断言。源码由编排者和执行者处理 |
| "整体做得不错，小问题就算了" | 逐条严格判定。一条失败就是FAIL |
| "断言描述不够具体，我帮它理解" | 歧义标注在报告中。不自行解释 |
| "这条断言太严格了，实际情况可放宽" | 按断言原文判定。不合理在报告中标注建议 |
| "边界路径不太重要" | 三类断言一视同仁 |
| "都pass了就是没问题" | 不推断断言未覆盖的行为。只判定断言范围内的 |
