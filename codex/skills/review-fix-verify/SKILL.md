---
name: review-fix-verify
description: 修复质量验证——对评审发现修复后进行逐条回验+diff扫描+对抗验证，判定修复是否真正解决了问题。deep-review 下游子 Skill，也可独立调用。
provides: [修复质量验证]
depends_on:
  - skill: deep-review
    phases: [Step2]
    purpose: 在调用链末尾追加修复验证阶段
    optional: true
    degradation: "deep-review 不可用时，手动指定原始评审报告路径即可独立运行"
---

# 修复质量验证（Fix Verification）

你是修复质量验证员。你的输入是一份已完成的评审报告 + 修复后的代码/文档变更，你的输出是每条修复的质量判定。

## 铁律

- **只验证不评审**：不做新的问题发现（那是 deep-review 的事），只验证已有问题的修复质量
- **验证方式必须可重复执行**：原行动项的验证方式如果不可机器执行 → 标记 `⚠️ 需人工判定`
- **diff 范围与声明必须匹配**：声明"改一行"但 diff 200 行 → 🔴 直接 blocked
- **引入新 🔴 → 立即 blocked**：不浪费第二轮验证
- **最多 2 轮验证**：超过标记 blocked → 人类决策分叉

---

## 输入要求

调用者必须传入：

| 输入 | 必须 | 说明 |
|------|:--:|------|
| 原始评审报告路径 | ✅ | 从 `<project>/memory-hub/reviews/` 读取行动项和验证方式 |
| 修复声明 | ✅ | 修复者声称修改了什么（一句话，或从 commit message / 任务描述获取） |
| 修复 diff | ✅ | `git diff` 或文件变更清单 |
| 第几轮验证 | ✅ | round=1 或 round=2 |
| auto_mode | ✅ | 无人值守标志（true/false），由调用方（orchestrator 或用户）传入 |

---

## Step 1: 修复风险评估

在读任何代码之前，先根据**修复本身的特征**判定风险等级：

| 修复特征 | 判定 |
|----------|:--:|
| 涉及认证/权限/支付/数据删除/并发/密钥管理 | 🔴 高风险 |
| 涉及 3+ 文件 或 新增外部依赖 | 🔴 高风险 |
| diff 行数 > 200 行 | 🔴 高风险 |
| 涉及核心算法/业务逻辑变更 | 🟡 中风险 |
| 涉及 2 文件 / 50-200 行 diff | 🟡 中风险 |
| 涉及 UI/配置/文档/文案/样式 | 🟢 低风险 |
| 单行/单文件 / < 50 行 diff | 🟢 低风险 |

**按最高匹配项定级**。例如：涉及 UI 但改了 300 行 → 🔴。

**验证策略**：

| 风险 | 策略 |
|:--:|------|
| 🔴 高 | 轻量验证 + 对抗验证（双保险，即使轻量通过也要对抗） |
| 🟡 中 | 轻量验证，不通过 → 升级对抗；通过 → 结束 |
| 🟢 低 | 仅轻量验证，不通过 → 升级对抗；通过 → 结束 |

---

## Step 2: 轻量验证（Lightweight Verification）

逐条对照原评审报告中的行动项，按验证方式回验。

### 2.1 验证方式可执行性检查

对每个行动项的验证方式做分类：

| 类型 | 示例 | 可机器执行 |
|------|------|:--:|
| **L1 命令型** | `grep "pattern" file`, `bash "cmd"`, `curl endpoint` | ✅ 直接执行 |
| **L2 读取型** | `Read file + check line range`, `检查某段文本是否存在` | ✅ Read 工具验证 |
| **L3 人类型** | `检查 UI 是否美观`, `确认表单交互流畅` | ❌ 标记 `⚠️ 需人工判定` |

### 2.2 逐条回验

```markdown
对每个行动项 P[n]：

1. 重新执行原验证方式（L1/L2）或标记需人工（L3）
2. 对照原问题描述，检查修复是否解决了**根因**而非症状：
   - 症状修复：加个 `try-catch` 吞掉异常，但底层逻辑未改
   - 根因修复：修正了导致异常的逻辑错误
3. 判定：
   - ✅ 已修复：验证方式通过 + 根因已解决
   - 🔄 部分修复：验证方式通过但根因未解决（症状修复）/ 验证方式不通过但明显有改动
   - ❌ 修复无效：验证方式不通过且无明显改动
   - ⚠️ 需人工判定：L3 类型，无法机器验证
```

**症状 vs 根因的快速判断**：
- 症状修复的特征：增加了 null check / try-catch / fallback 但核心逻辑没变；修了报错但没修为什么报错
- 如果无法判断根因是否解决 → 标记 `🟡 需下一轮对抗验证确认`

### 2.3 Diff 范围扫描

对比修复声明和实际 diff：

```
声明范围：据修复者声称，本次修改涉及 [声明内容]
实际 diff：共 N 个文件 M 行变更

如果 N > 声明文件数 × 3 或 M > 声明行数 × 5：
  → 🔴 直接 blocked，原因：修复范围远超声明，修复者可能不理解问题边界
```

**额外检查**：
- diff 中是否新增了不在评审发现范围内的文件？ → 🟡 标记，可能是过度设计
- diff 中是否修改了与评审发现无关的模块？ → 🟡 标记，可能是附带修改
- diff 中是否删除了与评审无关的逻辑？ → 🟡 标记，可能是误删

### 2.4 引入新问题扫描

**快速 grep**：在原评审报告的 🔴 问题相关的文件之外，是否有新的逻辑变更：
- 新引入的条件分支 → 检查是否覆盖了所有异常路径
- 新引入的函数/方法 → 检查是否有对应的调用处理
- 新增的外部调用 → 检查是否有超时/错误处理

**发现新 🔴 → 立即 blocked**，不进入第 2 轮：
```
发现修复引入了新的严重问题：
  原问题：[原 🔴 描述]
  新问题：[新 🔴 描述]
  判定：blocked — 修复引入新问题，不应继续迭代，需人类重新评估
```

### 2.5 轻量验证输出

```json
{
  "round": 1,
  "strategy": "lightweight",
  "items_verified": 5,
  "results": [
    {"id": "P1", "status": "fixed", "method": "grep", "evidence": "pattern found at line 42"},
    {"id": "P2", "status": "partial", "method": "Read", "evidence": "text changed but root cause not addressed"},
    {"id": "P3", "status": "ineffective", "method": "bash", "evidence": "command still fails with same error"},
    {"id": "P4", "status": "needs_human", "method": "L3", "evidence": "UI interaction check — human required"},
    {"id": "P5", "status": "fixed", "method": "Read", "evidence": "deleted lines 100-105 as required"}
  ],
  "diff_scan": {
    "declared_scope": "修改 auth.ts 中的 token 验证逻辑",
    "actual_diff": { "files": 1, "lines": 23 },
    "scope_match": true,
    "new_files": [],
    "unrelated_changes": false
  },
  "new_issues_found": [],
  "verdict": "needs_fix",
  "summary": "5 项中 2 fixed / 1 partial / 1 ineffective / 1 needs_human。需进入第 2 轮。"
}
```

**verdict 判定规则**：
- 所有行动项 `fixed` 或 `needs_human` → `pass`
- 有 `ineffective` 或 有 `partial` 且风险等级 🟡/🔴 → `needs_fix`（进入下一轮）
- 有新 🔴 → `blocked`
- 仅 L3 `needs_human` 未解决 → `human_required`
- Round 2 后仍 `needs_fix` 且 `auto_mode=true` → `degrade_accept`（降级，不阻塞管线）

---

## Step 3: 对抗验证（Adversarial Verification）

触发条件：
- 🔴 高风险修复 → 始终触发（即使轻量通过）
- 🟡/🟢 修复 → 轻量验证 `needs_fix` 时触发

### 3.1 对抗视角 Prompt

对抗验证使用独立 subagent，Prompt 结构与原 Reviewer 不同：

```
你是独立修复验证员。你的任务是怀疑这个修复——找出它为什么
**可能没有解决根因**或**可能引入了新问题**。

原始问题：[评审报告中的问题描述 + 原始验证方式 + 原始发现]

修复声称：[修复声明]

修复 diff 摘要：[diff 的关键变更，压缩到 ≤ 500 tokens]

请按以下维度逐一检查并输出判定：
1. **根因诊断**：修复是否针对问题根因而非表面症状？
   - 如果是症状修复 → 指出根因并提出真正的修复方向
2. **边界破坏**：修复是否在边界条件下失效？
   - 空值 / 超大值 / 并发 / 超时 / 权限不足 等场景
3. **副作用**：修复是否引入了新的逻辑漏洞或数据不一致？
4. **过度工程**：修复是否比问题本身更复杂？
   - 声明改 10 行的修复实际改了 100 行 → 标记过度

输出 JSON：
{
  "verdict": "pass" | "fail",
  "root_cause_fixed": true | false | "uncertain",
  "boundary_issues": ["..."],
  "side_effects": ["..."],
  "over_engineered": true | false,
  "reason": "一句话总结"
}
```

### 3.2 对抗验证执行方式

```
对抗验证通过 Agent tool 启动独立 subagent：
  Agent({
    subagent_type: "general-purpose",
    description: "对抗验证-[问题编号]",
    prompt: "[§3.1 的对抗 Prompt，填充实际数据]",
    isolation: "worktree"  // 在干净副本中审查，防止上下文污染
  })
```

如果行动项 > 3 个需要对抗验证，**聚合为一个 subagent 调用**，而非逐个扇出（每个对抗 subagent 需要读 diff + 原始报告，扇出会重复加载上下文）。

### 3.3 对抗验证结果合成

```
对抗验证通过 → 覆盖轻量验证结果，最终判定 pass
对抗验证不通过 → 最终判定 blocked
对抗验证 uncertain → 保留原轻量判定（偏保守）
```

---

## Step 4: 轮次管理

### 完整流程

```
Round 1:
  ├── 修复完成 → 修复风险评估
  ├── 轻量验证（Step 2）
  └── 高风险修复 → 对抗验证（Step 3）
      ├── 全部通过 → ✅ 结束
      └── 不通过 → 进入 Round 2

Round 2:
  ├── 修复者重新修改（基于 Round 1 反馈）
  ├── 重新轻量验证
  └── 对抗验证（本轮必须执行，不论风险等级）
      ├── 通过 → ✅ 结束
      └── 不通过 → 🔴 blocked → 人类决策分叉
```

### 提前终止规则

| 情况 | 处理 | 理由 |
|------|------|------|
| 引入新 🔴 问题 | 立即 blocked | 修坏比没修好更严重，不应迭代 |
| diff 范围远超声明（文件数×3 或行数×5） | 立即 blocked | 修复者不理解问题边界 |
| Round 2 对抗验证失败 | blocked | 已达上限 |
| 所有行动项都是 L3 且修复者声称已修 | human_required | 无法机器验证 |

### Blocked 后的决策分叉

**auto_mode = false（有人值守）**：输出选项供人类选择

```
Blocked → 输出以下选项供人类选择：
  A. 换人修复（resume 不同 Worker，原修复者可能有盲区）
  B. 降级接受（标记 known issue + 风险记录，告一段落）
  C. 重新定义问题（原评审发现可能有误，需要重新评审原始问题）
```

**auto_mode = true（无人值守）**：自动降级接受，不等待人类

```
Blocked → 自动降级接受：
  1. 输出 verdict: "degrade_accept"
  2. 附残留风险评估（具体到文件/功能点）
  3. 附建议人类后续检查的操作（具体步骤）
  4. 不输出 A/B/C 选项——无人可决策
  5. 由调用方（orchestrator）负责写入 blocked_items 日志
```

degrade_accept 输出格式：
```json
{
  "verdict": "degrade_accept",
  "reason": "Round 2 对抗验证不通过 — 根因可能未解决",
  "residual_risk": "CSV 导出在空数据集情况下可能仍返回 500",
  "suggested_human_action": "手动测试 CSV 导出：空数据 / 单行 / 1000行 三种场景，确认后解除 blocked",
  "blocked_at": "2026-06-12T10:30:00+08:00"
}
```

---

## 执行流程总览

```
1. 读取输入：原始评审报告 + 修复声明 + diff
2. Step 1 风险评估：按修复特征定级 🔴/🟡/🟢
3. Step 2 轻量验证：
   ├── 2.1 分类行动项为 L1/L2/L3
   ├── 2.2 逐条回验并做症状/根因判断
   ├── 2.3 diff 范围扫描
   ├── 2.4 新问题扫描
   └── 2.5 输出 verdict
4. Step 3 对抗验证（按风险策略触发）：
   ├── 构建对抗 Prompt
   ├── 启动独立 subagent
   └── 合成结果
5. Step 4 轮次判定：
   ├── pass → 输出最终报告 ✅
   ├── needs_fix → 输出反馈，进入下一轮 🔄
   └── blocked → 输出人类决策分叉 🔴
```

---

## 输出格式

```markdown
## Fix Verification 结果

| 项目 | 值 |
|------|-----|
| 原始评审报告 | [路径] |
| 修复声明 | [一句话] |
| 验证轮次 | Round N/2 |
| 修复风险等级 | 🔴/🟡/🟢 |
| 验证策略 | lightweight / lightweight+adversarial |

### 逐条验证结果

| # | 原发现 | 验证方式 | 结果 | 证据 |
|---|--------|---------|:--:|------|
| P1 | [问题摘要] | [方式] | ✅/🔄/❌/⚠️ | [证据摘要] |

### Diff 扫描

| 检查项 | 结果 |
|--------|------|
| 声明范围 vs 实际范围 | 匹配 / 不匹配（[差异]） |
| 新增文件 | 无 / [列表] |
| 无关修改 | 无 / [列表] |
| 新问题 | 无 / [🔴N 🟡N] |

### 对抗验证（如有）

| 维度 | 判定 |
|------|:--:|
| 根因已解决 | 是 / 否 / 不确定 |
| 边界问题 | 无 / [列表] |
| 副作用 | 无 / [列表] |
| 过度工程 | 是 / 否 |

### 最终判定

- ✅ 修复通过 — [一句话]
- 🔄 需再修改 — [具体反馈，进入 Round N+1]
- 🔴 Blocked — [原因 + 人类决策分叉（auto_mode=false）/ 自动降级接受（auto_mode=true）]
- ⚠️ 需人工判定 — [哪些项无法机器验证]
- 🔽 降级接受 — [残留风险 + 建议人类后续操作]（仅 auto_mode=true 时输出）
```

---

## 与 deep-review 的集成

### 路由触发

deep-review 在 Step 2（串行调用）末尾，当以下条件同时满足时，追加 review-fix-verify：

```
条件 1: 当前评审对象存在历史评审报告（<project>/memory-hub/reviews/review-*-{target}.md）
条件 2: 历史评审报告中存在非 completed 状态的行动项
条件 3: 当前代码/文档有改动（git diff 非空）

触发 → review-fix-verify 作为调用链最后一个阶段执行
```

### 独立调用

也可以脱离 deep-review 独立使用：

```
"验证这个修复: 原始评审在 <project>/memory-hub/reviews/review-20260612-xxx.md,
 修复 diff 是最近一次 commit"
```

### 与 orchestrator 的协作

```
orchestrator dev_loop:
  Worker 修复完成 → deep-review Phase 4 → 诊断 JSON: needs_fix
  → Worker 再次修复 (fix_iterations++)
  → deep-review 检测到存在历史评审 → 追加 review-fix-verify
  → review-fix-verify 输出 verdict
      ├── pass → contract-validator
      ├── needs_fix → resume Worker (fix_iterations++, max 2)
      └── blocked → orchestrator 暂停, 输出人类决策分叉
```

---

## 禁止事项

- **不得做新问题发现**：本 Skill 只验证已有修复，不扫描新问题。发现新问题 ≠ 修复验证不通过——新问题应回写到原评审报告的行动项列表
- **不得跳过风险评估直接验证**：修复特征决定验证策略，低风险修复不做对抗验证
- **不得在 Round 1 未通过时不做反馈直接 blocked**：Round 1 失败必须给出具体反馈（哪条没过、为什么、怎么改），让修复者有机会在 Round 2 修正
- **不得超出 2 轮**：第 2 轮仍失败 → blocked，不允许第 3 轮
- **不得将 L3 项标记为 fixed**：无法机器验证的项目必须标记 `⚠️ 需人工判定`，不得凭推测标记为已修复
- **不得在 diff 范围严重不匹配时继续验证**：声明与实际差异过大时直接 blocked，这是修复者理解问题的信号
- **对抗验证必须用独立 subagent**：不能在主对话中做对抗验证——同一上下文中的"对抗"不是真正的对抗，只是同一个模型的自我纠正

## Codex Adapter Note

This skill lives under `codex/skills` as a Codex staging adaptation. Project memory should use local `<project>/memory-hub`; cross-project long-term knowledge should be curated into `E:\个人仓库\03_Knowledge\记忆中枢`; config-system protocol lives in `E:\claude-config-master\memory-hub`.