# Agent Prompt 设计规范 v1.0

> **定位**：agent-builder Skill 的核心设计规范。合并自 `agent-design-guide.md` v3.0 理论层和 `agent-prompt-self-sufficiency-test.md` 判定表，聚焦"Agent Prompt 怎么写才正确"。
> **权威源**：本文件是 Agent Prompt 内容归属的唯一判定标准。`agent-design-guide.md` 为架构指南（Agent/Skill 边界、双轨制、创建流程），本文件为 Prompt 写作规范。
> **适用范围**：所有系统级和项目级 Agent 定义文件。

---

## 一、铁律：自给自足测试

> **"Agent 不读这段内容就会犯错 → 必须放进 Prompt；不读也不会直接犯错 → 放外挂知识库。"**

这是所有设计决策的最终裁决标准，没有例外。来源：[Anthropic Skill 架构](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

---

## 二、三层加载结构

Agent 永远只暴露三层，严格按顺序加载：

```
第1层：元数据 (~50 tokens)
  └── name + description + tools + model
  └── 作用：决定是否触发这个 Agent（启动时加载）

第2层：核心指令 (≤2000 tokens)  ← 自给自足的全部内容
  └── 铁律 + 禁止事项 + 路由表 + 执行流程 + 角色锚定
  └── 作用：Agent 只读这层就能正确路由并输出无危害结果

第3层：深化材料 (无上限，外挂知识库)
  └── agent-knowledge/<name>/knowledge/  + patterns/ + decisions/
  └── 作用：可选深化，不读也不会直接犯错
```

**硬约束**：第2层必须独立保证行为正确，第3层只能提升质量，不能纠正行为。

---

## 三、第2层内容归属（自给自足判定表）

第2层就是 Agent Prompt 本体。用自给自足测试逐条判定每类内容的归属：

| 内容类型 | 不读会犯错？ | 放哪里 | 理由 |
|---------|:-:|--------|------|
| **铁律**（不可违反边界） | ✅ 违反即灾难 | **第2层 Prompt** | 一句不可违反的边界，≤30 字 |
| **禁止事项** | ✅ 缺少会行为越界 | **第2层 Prompt** | 明确列出不能做的事，≥3 条 |
| **路由表**（场景→Skill/流程） | ✅ 路由错全盘输 | **第2层 Prompt** | Agent 的核心价值，显式表格 |
| **执行流程步骤**（SOP） | ✅ 跳步骤会出错 | **第2层 Prompt** | ≤10 步，可精简描述 |
| **角色与语气锚定** | 🟡 不读不会直接犯错 | **第2层 Prompt** | 一句话定调，≤30 字 |
| **输出示例** | 🟡 格式偏差可接受 | **第2层 Prompt**（精简） | ≤30 行 |
| **认知偏差反驳表** | ❌ 不读不会直接犯错 | **第3层 patterns/** | 合并入禁止事项的违规示例（精简版可留 Prompt） |
| **场景适配大表** | ❌ 通用流程已覆盖 | **第3层 knowledge/** | 项目类型差异深化 |
| **领域知识全文** | ❌ 铁律摘要已覆盖 | **第3层 knowledge/** | 详细说明+示例 |
| **Skill 内部方法论** | ❌ Skill 自包含 | **Skill references/** | Agent 不需要知道细节 |
| **检查清单/自问自答** | ❌ 不读不会直接犯错 | **第3层 knowledge/** | 按需 Read |
| **示例对话** | ❌ 不读不会直接犯错 | **Skill 内部 few-shot** | Agent 不保存示例 |

### 精简规则

以下情况可以精简或合并：

| 情况 | 处理 |
|------|------|
| 禁止事项已隐含在铁律中 | 删除重复项，保留铁律 |
| 执行流程某一步是常识性操作 | 合并为一步，或移到 knowledge/ |
| 两条禁止事项覆盖同一风险 | 合并为一条 |
| 路由表中某场景极少触发 | 移到 knowledge/，Prompt 中只留"其他场景见 knowledge/"指针 |

---

## 四、什么绝对不能放第2层（膨胀陷阱）

这些内容会稀释模型注意力，必须移到第3层或 Skill 内部：

1. **大段领域知识全文** → `agent-knowledge/<name>/knowledge/`
2. **长篇背景介绍** → 项目 CLAUDE.md 或 knowledge/
3. **详细的场景适配矩阵** → `agent-knowledge/<name>/knowledge/scenario-matrix.md`
4. **示例对话** → Skill 内部 few-shot 控制，Agent 不保存
5. **检查清单、自问自答列表** → `agent-knowledge/<name>/knowledge/`，按需 Read
6. **长篇幅认知偏差反驳表** → `agent-knowledge/<name>/patterns/cognitive-biases.md`
7. **Red Flags 表** → 与反驳表合并到 patterns/，禁止事项中只保留精简版违规示例

**记住**：如果 Agent 跳过它，输出的核心结果不会错，就不该在 Prompt 里。

---

## 五、Agent 与 Skill 的边界规范

| 维度 | Agent | Skill |
|------|-------|-------|
| **本质** | 角色身份——"我是谁，我负责什么" | 能力实现——"怎么做，流程是什么" |
| **厚度** | 薄（50-120 行，≤2000 tokens） | 厚（自包含工作流 + references/） |
| **知识** | 外挂知识库（agent-knowledge/） | 内嵌方法论和参考文件 |
| **依赖方向** | 依赖 Skill 提供能力 | 自包含，不依赖外部 Agent |
| **调用方式** | `Agent` 工具指定 `subagent_type` | `Skill` 工具或 Agent 内部路由 |

**核心原则**：
- **Agent = 调度器**：路由到正确 Skill、守住铁律、掌控全局流程
- **Skill = 执行器**：自包含地完成专业任务，可引用自己的 references/
- **禁止反向依赖**：Skill 里不得写"请参考 Agent 的禁止事项"——这会制造隐性依赖，破坏自给自足
- **每个能力域只有一个权威 Skill**：Agent 通过路由表编排 Skill，不重复实现 Skill 的能力

---

## 六、设计检查清单

每写一版 Agent Prompt，逐条核验：

### 自给自足检查
- [ ] 删掉所有第3层内容后，Agent 还能正确路由并输出无危害的结果吗？
- [ ] 路由表在 Prompt 里吗？（不在 knowledge/ 文件里）
- [ ] 铁律和禁止事项是否无歧义？有没有可能被模型"善意"绕过？
- [ ] 路由表是否覆盖了当前所有已启用的 Skill？是否有死路由？

### 精简检查
- [ ] 总行数 ≤150（理想 50-100）？
- [ ] 总 token ≤2000？
- [ ] 执行流程的每一步是否必要？有没有可以合并的步骤？
- [ ] 禁止事项是否重复了铁律已覆盖的约束？
- [ ] 是否有冗余内容（Red Flags + 反驳表双写、同一约束多处出现）？

### 完整性检查
- [ ] frontmatter（name/description/model/tools）完整？
- [ ] 有角色定位 + 铁律（≤30 字）？
- [ ] 有 Skill 路由表（显式表格，≤8 行）？
- [ ] 有执行流程（≤10 步）？
- [ ] 有 few-shot 输出示例（含 ≥1 个具体输入→输出，非仅格式模板，≤30 行）？
- [ ] 有禁止事项（≥3 条）？
- [ ] 有链式交接声明？
- [ ] 有 agent-knowledge 和 agent-memory 指针？
- [ ] 有入口判定（orchestrator 调度 / 用户直接调用 两种入口）？

### 超标时的裁剪顺序
1. 先删减禁止事项的举例（保留禁止项本身）
2. 再精简流程描述（合并步骤）
3. 再缩短路由表的触发条件列
4. 最后考虑移出低频路由到 knowledge/

---

## 七、标准 Prompt 骨架

```markdown
---
name: <role-name>
description: <英文触发描述，含角色定位+适用场景+2-4个示例对话>
tools: [最小必要工具集]
model: sonnet | opus | haiku
---

## 角色定位

你是[角色名]（[English Name]）。[一句话定位核心职责]。

> **铁律**：[一句不可违反边界，≤30 字]

## 入口判定

**orchestrator 传入 Context Card** → 直接使用，不重复读取
**用户直接调用（无 Context Card）** → 执行 bootstrap:
  1. 读取项目 CLAUDE.md
  2. 读取架构图记忆（如有）
  3. 向用户确认：任务范围、验收标准、关键约束
  4. 确认后再执行

## Skill 路由

| 场景 | 调用 | Phase/参数 | 触发条件 |
|------|------|-----------|---------|
| [场景1] | [Skill名] | Phase N | [何时触发] |

> **路由表是 Agent 的核心价值——必须在 Prompt 里，不能放知识库。**

## 执行流程

1. [步骤1]
2. [步骤2]
...

## 输出示例

[≤30 行的具体输入→输出 few-shot。不是格式模板——是"如果收到这样的输入，你应该输出类似这样的内容"的具体示例。至少 1 个。如果 Agent 有两种差异显著的输出模式，各给 1 个。]

## 记忆与知识

| 类型 | 路径 | 何时用 |
|------|------|--------|
| 自检 | `~/.claude/agent-knowledge/<name>/patterns/cognitive-biases.md` | 决策前 Read |
| 深化 | `~/.claude/agent-knowledge/<name>/knowledge/` | 需要详细标准时 Read |
| 记录 | `~/.claude/agent-memory/<name>/lessons/` | 踩坑时必须写入 |

> **指针原则**：Prompt 中只列文件路径+一句话，Agent 运行时按需 Read。

## 禁止事项

- 不得 [核心风险边界1]
  → 警惕"[你会怎么违反它的具体场景]"
- 不得 [核心风险边界2]
- 不得 [核心风险边界3]

## 链式交接

- [完成] → [谁接手，做什么]
- [失败] → [谁接手，做什么]
```

### 骨架使用说明

1. **铁律**：一条就够。如果觉得需要两条，检查是否有一条是禁止事项。
2. **路由表**：覆盖 ≥80% 的常见场景。低频场景在 knowledge/ 中补充。
3. **禁止事项的违规示例**：每条禁止项后的 `→ 警惕"..."` 是可选的——只在"模型容易合理化违规"的高风险禁止项上使用。如果所有禁止项都加了示例导致超 token，只保留最容易违规的 2-3 条加上示例。
4. **执行流程**：不要写"读 XX 文件"这种常识步骤。只写"这个 Agent 特有的、跳过了会出错的步骤"。
5. **输出示例**：如果 Agent 的输出格式很简单（如"只返回文件路径"），可以省略。

---

## 八、配套文件关系

```
agent-builder SKILL.md          ← 创建流程（Step 1-6）+ 三层诊断
    ↓ 引用
references/agent-prompt-design-spec.md  ← 本文件：Prompt 写什么、怎么写
    ↓ 理论来源
E:/claude-config-master/memory-hub/decisions/agent-design-guide.md  ← Agent/Skill 架构、双轨制、创建流程
memory-hub/Skill设计/agent-prompt-self-sufficiency-test.md  ← 自给自足测试理论基础
```

**修改规则**：
- 改 Prompt 写作规范 → 改本文件
- 改 Agent/Skill 架构 → 改 `agent-design-guide.md`
- 改创建流程或诊断标准 → 改 `agent-builder SKILL.md`
- 本文件变更后 → 同步更新 agent-builder SKILL.md 中的引用（如有）
