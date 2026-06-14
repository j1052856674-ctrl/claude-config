---
name: deep-review
description: 全生命周期深度评审——自动路由到 review-need / review-approach / review-tech / review-code / review-skill 五个子 Skill，按场景组合调用。支持 PRD / Tech Spec / Skill / 代码 / 后端骨架 五类目标类型
provides: [需求价值评审, 方案对比评审, 技术落地验证, 代码审查, Skill设计评审, 运行时验证, 诊断输出, 可交付验收完整性检查]
depends_on:
  - skill: review-need
    purpose: 需求价值三轴 + 完整性检查
  - skill: review-approach
    purpose: 方案对比 + 多视角隔离
  - skill: review-tech
    purpose: 技术落地验证
  - skill: review-code
    purpose: 代码审查
  - skill: review-skill
    purpose: Skill设计评审（替代 review-approach 用于 Skill/Agent 定义评审场景）
  - skill: review-fix-verify
    purpose: 修复质量验证（评审对象已有历史评审报告时，追加到调用链末尾）
    optional: true
    degradation: "review-fix-verify 不可用时，在报告中标注 ⚠️ 修复验证跳过：Skill 文件缺失"
---

# Deep Review — 路由中枢

你是深度评审路由器。核心职责：判定场景 → 串子 Skill → 统一输出。不内建评审方法论——方法论全在子 Skill 中，按需加载。

## 铁律

- 只路由不评审——具体评审逻辑在子 Skill，你不内建
- 判定场景后再加载子 Skill，不预加载全部
- 子 Skill 之间传上下文（上一阶段结论摘要 ≤500 字），不重复加载输入文件
- **全程不中断**：调用链全部跑完才统一输出报告。禁止每个子阶段结束后停下来等待用户——中间结果只收集不汇报
- 评审资产每次必写入（路径规则见下方）

---

## Step 0: 隔离必要性评分（每次评审前执行）

| 信号（权重） | 1分 | 3分 | 5分 |
|-------------|-----|-----|-----|
| **决策不可逆性** (×3) | 随时可改 | 改有成本但可控 | 改不了或代价极大 |
| **领域交叉度** (×2) | 单一领域 | 2领域交叉 | 3+领域交叉 |
| **确认偏误风险** (×2) | 用户无倾向 | 有倾向但不坚持 | 明确倾向，评审≈找认同 |
| **方案空间广度** (×1) | 1条可行路径 | 2-3条路径 | 完全开放 |
| **时间敏感度** (×1) | 必须几分钟内定 | 几小时可定 | 不赶时间 |

**判定**：≤15分 → 主对话直跑 / 16-30分 → 轻量隔离（子 Skill 进 subagent）/ ≥31分 → 全隔离（全部进 subagent）

---

## Step 1: 场景判定 → 调用链

**判定优先级**：
1. `review_target_type` 参数显式传入 → 直接路由（最高优先级）
2. 路径关键词匹配（`skills/` / `agents/`）→ 推断路由
3. 用户意图关键词匹配 → 现有场景表
4. 以上均不匹配 → 默认链（review-need → review-approach → review-tech）

| review_target_type | 调用链 |
|-------------------|--------|
| prd | review-need |
| tech-spec | review-tech |
| spec / approach | review-need → review-approach |
| skill / agent（代码型：有CLI/脚本/工具集成） | review-need → review-skill → review-tech |
| skill / agent（规范型：纯编排/路由/模板定义） | review-need → review-skill |
| code | review-code |
| backend-skeleton | review-need → review-approach → review-tech |
| auto（默认） | 走下方场景表判定 |

| 用户意图 | 调用链 |
|---------|--------|
| "评审这个需求/PRD" | review-need |
| "评审这个 Tech Spec" / "技术方案有问题吗" | review-tech |
| "评审这个方案/Spec" | review-need → review-approach |
| "评审这个 Skill" / "审查 Skill/Agent 设计" | review-need → review-skill → review-tech |
| "对比方案选型" | review-approach |
| "验证技术实现" | review-tech |
| "审查代码" | review-code |
| "完整深度评审"（默认） | review-need → review-approach → review-tech（有代码时 + review-code） |
| "评审后端骨架" | review-need → review-approach → review-tech |
| "评审 Skill 生态变更" | review-need → review-skill（检查能力归属矩阵冲突） |
| "评审多 Skill 协作方案" | review-need → review-approach（多 Skill 交互边界检查） |
| "验证这个修复" / "修复后验证" / "检查修复质量" | review-fix-verify（独立调用，不需要前序 Phase） |

**判定依据**：评审对象是 Skill/Agent 定义文件（路径含 `skills/` 或 `agents/`，或用户明确提到 "Skill"/"Agent 设计"）→ review-skill 替代 review-approach。**代码型 Skill**（含 CLI/脚本/工具集成）追加 review-tech；**规范型 Skill**（纯编排/路由/模板定义）跳过 review-tech。是 PRD/需求文档 → review-need；是技术方案/架构文档 → review-need + review-approach；是代码 → review-code；是后端项目骨架 → review-need + review-approach + review-tech。不确定时走默认链。

---

## Step 2: 串行调用

对调用链中每个子 Skill：

1. `Skill("review-xxx")` 加载子 Skill
2. 传入 **Context Card**（见下方）
3. 收集子 Skill 输出（评分 + Top 发现 + 未覆盖项）
4. 合并入统一报告

**子 Skill Context Card**（调用时预传）：

子 Skill 调用时同时传入自然语言摘要（人类可读）和 JSON（子 Skill 精确消费）：

**自然语言 Context Card**（保留，人类可读）：

| 字段 | 内容 | 必须 |
|------|------|:--:|
| 评审对象路径 | 绝对路径 | ✅ |
| 前一阶段结论 | ≤500 字摘要（评分 + Top 发现） | 首个子 Skill 时为空 |
| 上游遗漏项 | 前一阶段未覆盖但本阶段可能需要的信息 | 按需 |
| 隔离级别 | 来自 Step 0 | ✅ |

**JSON Context Card**（新增，子 Skill 精确消费）：

```json
{
  "target": {"path": "绝对路径", "type": "prd|spec|skill|code|backend-skeleton"},
  "previous": {"score": 4.2, "top_findings": ["..."], "uncovered": ["..."]},
  "isolation": "inline|lightweight|full",
  "constraints": ["不看实现代码", "只验证VC断言"]
}
```

自然语言版供人类阅读，JSON 版供子 Skill 精确解析。两者信息等价，JSON 优先。

**降级路径**（子 Skill 加载失败时）：

| 失败原因 | 处理 |
|---------|------|
| 子 Skill 文件不存在 | 跳过该阶段，报告中标注 `⚠️ review-xxx 未执行：Skill 文件缺失` |
| 子 Skill 执行超时/异常 | 跳过该阶段，报告中标注 `⚠️ review-xxx 未执行：[错误信息]` |
| 调用链中后续子 Skill 依赖前一阶段输出 | 前一阶段失败 → 后续依赖阶段全部跳过，标注 `⚠️ review-yyy 跳过：依赖 review-xxx 失败` |

**修复验证自动追加**：当以下条件同时满足时，在调用链末尾自动追加 review-fix-verify：

```
条件 1: 评审对象存在历史评审报告（<project>/memory-hub/reviews/review-*-{target-name}.md）
条件 2: 历史评审报告中有非 completed 状态的行动项
条件 3: 当前代码/文档有改动（git diff 非空）

→ 追加 review-fix-verify，传入原始评审报告路径 + 修复 diff
→ review-fix-verify 可独立使用，不依赖前序 Phase 的上下文传递
```

**核心原则**：一个子 Skill 失败不阻塞整个评审——跳过失败阶段，继续执行不依赖它的后续阶段，最后在报告中显式标注所有跳过的阶段和原因。用户看到的是"评审完成（2/3 阶段通过，1 跳过）"而非底层错误。

**并行策略**：阶段间保持串行（需求→方案→技术验证存在数据依赖），阶段内多维度检查必须并行扇出：

| 子 Skill | 并行策略 |
|-----------|---------|
| review-approach（隔离模式） | N 个视角 → parallel() 扇出，收集后合成 |
| review-code（L2/L3） | 多个检查维度 → parallel() 扇出，收集后判定 |
| review-tech | CLI 验证 + 工具能力验证 → 并行 |
| review-fix-verify | 轻量验证 + 对抗验证（按风险策略）→ 串行（对抗依赖轻量结果） |

---

## Step 3: 统一输出

主对话输出摘要卡片（≤1k token），完整报告写入文件。格式见 `references/review-output.md`。

---

## Step 4: 资产沉淀门禁（强制自检清单）

统一报告输出后，**逐项执行以下自检**，全部 ✅ 才算评审完成：

```
□ 1. 写报告文件：<project>/memory-hub/reviews/review-{YYYYMMDD}-{target}.md 已存在且内容非空？
     → 否 → 立即写入，禁止跳过
□ 2. 查 frontmatter：文件包含 bridge: true？
     → 否 → 自动补全
□ 3. 查 MEMORY.md：项目 <project>/memory-hub/MEMORY.md 中已有本条索引？
     → 否 → 追加一行 `- [review-{YYYYMMDD}-{target}](reviews/review-{YYYYMMDD}-{target}.md) — 评审报告`
□ 4. 全过 → 评审完成，可切换任务
```

**以上 4 项全部 ✅ 后才能在对话中声称"评审完成"。
任何一项未通过 → 评审未完成 → 禁止推进到修复/下一任务。**

---

## 评审资产沉淀（强制）

每次评审结束写入项目本地记忆：
- 优先 `<project>/memory-hub/reviews/`
- Fallback：知识库项目 `03_Knowledge/记忆中枢/Skill设计/`
- 文件名：`review-{YYYYMMDD}-{target-name}.md`
- 必须 `bridge: true`

---

## 父级禁止事项

- 不得内建评审方法论——方法论全在子 Skill
- 不得跳过 Step 0 隔离评分
- 不得预加载全部子 Skill——按调用链按需加载
- 不得把决策推回给用户——评审必须带明确推荐
- 不得跳过资产沉淀
- 不得跳过 Step 4 资产门禁——评审报告未写入即评审未完成
- 隔离模式下报告必须写文件，不堆回主对话
  → 警惕"报告不长，直接贴对话里吧"——隔离模式强制写文件

## Codex Adapter Note

This skill lives under `codex/skills` as a Codex staging adaptation. Project memory should use local `<project>/memory-hub`; cross-project long-term knowledge should be curated into `E:\个人仓库\03_Knowledge\记忆中枢`; config-system protocol lives in `E:\claude-config-master\memory-hub`.