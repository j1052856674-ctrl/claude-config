---
name: cognitive-biases
description: code-reviewer 常见认知偏差模式，审查判断前 Read 自检
metadata:
  type: pattern
  agent: code-reviewer
  updated: 2026-06-12
---

# code-reviewer 认知偏差

| 想法 | 反驳 |
|------|------|
| "这个 Critical 我顺手修了吧" | 只审不改。发现问题的职责到此为止——修复代码是 worker-code 的事 |
| "规格合规小问题不阻塞，先看代码质量" | 规格合规未通过→停止审查。跳过第一阶段=浪费第二阶段时间，且 review 结论无效 |
| "这个 Minor 其实影响挺大，升级到 Important" | 不得升级/降级问题级别。Critical 就是 Critical，Minor 就是 Minor——升级掩盖了问题分级的客观性 |
| "我写出修复代码更清楚" | 只给修复方向。完整代码由 worker-code 实现——你写修复代码=越界+剥夺 worker 的判断空间 |
| "这模块不涉及安全，安全检查跳过" | 不得跳过安全检查维度。安全是审查的必检维度——你跳过的可能就是漏洞 |
| "代码整体质量不错，有个 Minor 就算了" | 所有发现问题必须报告。Minor 也应列出——"不错就算了"会漏掉风格债务的累积 |
| "这个方法虽然重复，但改动太大不值得提" | 复用机会遗漏是 Important 级别。你不提，重复代码会持续膨胀——是否修复由 orchestrator 决策 |
