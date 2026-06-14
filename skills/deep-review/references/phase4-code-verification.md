---
name: phase4-code-verification
description: Phase 4 代码与产出验证完整方法论——三档流程细节+L1/L2/L3操作示例+Worktree隔离+渐进清单+跨任务回验+最终批量验证
metadata:
  type: reference
  phase: 4
  supersedes: execution-guardian 方法论（已全量吸收，原 Skill 已移除）
---

# Phase 4: 代码与产出验证 — 完整方法论

> 本文件是 Phase 4 的详细操作手册。SKILL.md 中的 Phase 4 节只写路由框架和核心表格，具体执行细节见本文。

---

## 一、三档完整流程

### 🟢 轻量档（≤3 文件，≤50 行）

```
Step L1: Explore subagent（只读）
  ├── 输入：git diff + 改动说明
  ├── 输出：JSON schema（findings 数组 + summary，≤300 tokens）
  ├── subagent 类型：Explore（只读）
  └── critical findings > 0 → 输出诊断 JSON → needs_fix

Step L2: 快速功能确认
  ├── 启动 app（run skill 或 bash）
  ├── 截图关键页面（1-2 张）
  ├── 检查 5 项快速清单（每项标注 L1/L2/L3 层级）
  │   ① 渲染正常？② 无 console 错误？③ 关键交互可见？④ 核心数据加载？⑤ 无明显布局问题？
  └── critical findings > 0 → 输出诊断 JSON

Step L3: 输出诊断 JSON + 资产沉淀
  └── 额外开销 ≈ 1-2k tokens
```

### 🟡 标准档（4-10 文件，51-500 行）

```
Step M1: Explore subagent（只读）
  ├── 输入：git diff + 改动说明 + 关键文件路径
  ├── 输出：JSON schema（findings 数组 + summary，≤500 tokens）
  └── critical findings > 0 → 输出诊断 JSON → needs_fix

Step M2: 功能链路验证
  ├── 针对每个新增/修改的功能点，按风险等级选择 L2 深度：
  │   高风险（认证/权限/支付/删除/并发）→ L2-1 到 L2-4 全量
  │   中风险（数据展示/表单/状态流转）→ L2-1 + L2-2 + L2-4
  │   低风险（纯展示/静态/文案）→ L2-1 + L2-4
  ├── L1 验证：实际 curl/API 调用，检查状态码+响应体
  ├── L2 验证：按 L2 最低标准 4 项 + 风险等级裁剪
  ├── L3 验证：标注 ❌，给出人类验证步骤描述
  └── critical L1/L2 findings → 输出诊断 JSON

Step M3: 跨任务回验
  ├── 检查验证涉及的文件是否被其他已通过验证的任务依赖
  ├── 如有影响 → 增量验证受影响的功能点
  └── 增量验证发现问题 → 输出诊断 JSON

Step M4: 输出诊断 JSON + 资产沉淀
  └── 额外开销 ≈ 3-5k tokens
```

### 🔴 深度档（>10 文件，>500 行，架构级改动）

```
Step H1: Explore subagent（只读）（完整）
  ├── 输入：git diff + 改动说明 + 架构影响描述
  ├── 输出：JSON schema（findings 数组 + summary，≤500 tokens）

Step H2: deep-review subagent（code review 维度）
  ├── 触发条件：>10 文件 或 >500 行 diff（MUST，非可选）
  ├── 输入：关键代码片段（≥2 个文件路径+行号）+ architecture-map 摘要
  ├── 输出：JSON schema（findings + 评分，≤800 tokens）
  ├── subagent 类型：Explore（只读）
  └── token 优化：主 agent 预读传入关键代码片段，禁止"探索"类指令

Step H3: 全量功能链路验证
  ├── 所有新增/修改功能 → 按风险等级选择 L2 深度
  ├── L1/L2/L3 三层标记
  └── critical findings → 输出诊断 JSON

Step H4: 跨任务回验 + 最终批量验证
  ├── 全量 L1 回验（所有 API 端点重新跑一遍）
  ├── 检查跨任务修复是否破坏之前已通过的功能
  └── 发现问题 → 输出诊断 JSON

Step H5: 输出诊断 JSON + 风险评估 + 资产沉淀
  ├── 风险评估（未覆盖的验证盲区 + 潜在运行时风险）
  └── 额外开销 ≈ 8-15k tokens
```

---

## 二、诊断上限与轮次

| 档位 | 最大诊断轮次 | 超限处理 |
|------|------------|---------|
| 🟢 轻量 | 1（一轮诊断） | 标记 blocked |
| 🟡 标准 | 2（诊断→等待修复→再诊断） | 标记 blocked |
| 🔴 深度 | 2（诊断→等待修复→再诊断） | 标记 blocked |

> 轮次计数说明：诊断本身不消耗轮次。轮次指"诊断→外部修复→再诊断"的循环。首次诊断后标记 needs_fix → 外部修复 → 再次诊断验证 → 仍 critical → 标记 blocked。

---

## 三、L2 推理验证操作示例

### L2-1: 读取实际代码

```
正确做法：
  1. Read 工具打开目标文件
  2. 定位到具体函数/方法
  3. 确认实际实现与预期行为一致

错误做法：
  ❌ "根据之前的记忆，这个函数应该..."（凭记忆）
  ❌ "通常这类实现会..."（凭经验推测）
```

### L2-2: 追踪数据流路径

```
示例：用户登录功能
  输入：POST /api/login { username, password }
  → 路由处理（server.ts:142）
  → 密码哈希比对（auth.ts:67）
  → JWT 生成（auth.ts:89）
  → 响应返回（server.ts:156）
  输出：{ token, user }

检查项：
  - 每个环节的变量是否正确传递？
  - 错误路径是否被捕获？（密码错误/用户不存在/网络超时）
  - 中间件是否正确拦截未认证请求？
```

### L2-3: 检查边界条件

```
必须检查 ≥2 个边界情况：
  1. 空值：username="" → 应返回 400 而非 500
  2. 越界：password 长度 0/1/1000 → 应有合理校验
  3. 异常输入：SQL 注入尝试 → 应被参数化查询防护
  4. 并发：同时两个相同 username 注册 → 应有唯一约束
```

### L2-4: 对照需求验证行为

```
逐条对比：
  需求："登录失败 3 次锁定账户 15 分钟"
  代码：检查 login_attempts 计数器 + lock_until 时间戳
  验证：计数器递增逻辑是否正确？锁定时钟是否使用服务器时间？
```

---

## 四、跨任务回验算法

```
当修复 Task[N] 后重新验证时：

1. 读取 Task[N] 修复涉及的文件列表 F
2. 扫描已通过验证的任务列表 T[1..N-1]
3. 对每个已通过任务 T[i]:
   a. 读取 T[i] 验证时涉及的文件列表 G
   b. 如果 F ∩ G ≠ ∅ → T[i] 可能受影响
   c. 对 T[i] 做增量验证（只验证受影响的功能点，不全量重跑）
4. 增量验证失败 → 输出新诊断 JSON，标记 ⚠️
```

---

## 五、渐进清单（可选，项目级）

### 清单文件

```
位置：output/[项目名]/deep-review-checklist.md
格式：标准 Markdown，持续追加更新
生命周期：项目开始时创建，每次 Phase 4 执行后追加更新，项目结束时最终确认
```

### 清单模板

```markdown
# [项目名] 验证清单

> 创建：YYYY-MM-DD | 最后更新：YYYY-MM-DD HH:MM

## ✅ 已通过（L1：实际运行确认）

| # | 任务 | 功能 | 验证操作 | 结果 | 更新时间 |
|---|---|---|---|---|---|
| 1 | T1 | 登录接口 | curl POST /api/login | 200+token | Step3 完成 |

## ⚠️ 推理验证通过（L2：代码推理+截图，有盲区）

| # | 任务 | 功能 | L2完成项 | 需人确认点 | 更新时间 |
|---|---|---|---|---|---|
| 2 | T1 | 登录页渲染 | L2-1✅L2-2✅L2-3✅L2-4✅ | 表单居中美观？ | Step3 完成 |

## ❌ 需人真实操作验证（L3：AI 无法模拟）

| # | 任务 | 功能 | 验证步骤 | 预期行为 |
|---|---|---|---|---|
| 3 | T1 | 登录表单交互 | 打开→输入→点击登录 | 跳转首页 |

## 🔴 Blocked（诊断发现问题）

| # | 任务 | 功能 | 诊断发现 | 严重度 | 建议下一步 | 依赖链 |
|---|---|---|---|---|---|---|
| 4 | T3 | 批量导出 | 500错误+CSV格式问题 | critical | 检查权限+编码 | T4依赖T3 |
```

> 渐进清单是可选机制。orchestrator 编排时，验证状态记录在 orchestrator 状态文件的 `verification_records` 字段中，不需要独立清单文件。非 orchestrator 场景（用户直接调用 deep-review）时，清单文件提供跨任务的验证追踪。

---

## 六、最终批量验证（项目完成时触发）

```
所有任务完成后，触发一次最终全量验证：

Step F1: 全量 L1 验证 — 所有 API 端点重新跑一遍
Step F2: 跨任务 L2 回验 — 检查修复是否破坏其他已通过项
Step F3: 验证清单终版确认 — 所有 blocked 项标注建议修复方案
Step F4: 输出最终清单 — 一次性汇总所有 ✅/⚠️/❌/🔴 项
```

---

## 七、Worktree 隔离实现细节

### 创建与使用

```
轻量档:
  Agent 工具 spawn Explore subagent → 在项目目录直接审查 → 输出 JSON

标准档:
  Agent 工具 spawn subagent + isolation:"worktree"
  → git worktree 创建临时副本
  → subagent 在副本中审查
  → 通过：合并回主分支
  → blocked：不合并，worktree 自动删除

深度档:
  标准档的 Worktree subagent + 额外的 Explore subagent（只读审查）
  → Explore subagent 在 worktree 副本中读取文件
  → JSON schema 强制精简输出
```

### Blocked 任务处理

```
worktree subagent 完成后：

验证通过 → 主 agent 合并 worktree 改动回主分支 → worktree 自动删除
验证 blocked → 不合并 → worktree 删除 → 主分支不受影响（干净！）

关键价值：blocked 任务的改动不会污染主分支。
失败的代码不会留在项目里，回退成本为零。
```

---

## 八、上下文开销估算

| 场景 | 主对话直跑 | Subagent 隔离 | 主 context 节省 |
|------|----------|-------------|----------------|
| 1 个轻量任务 | ~8k tokens | 主~1k + sub~8k(释放) | 8k→1k |
| 5 个标准任务 | ~40k tokens | 主~5k + 5×sub(释放) | 40k→5k |
| 10 个标准任务 | ~80k tokens | 主~10k + 10×sub(释放) | 80k→10k（87.5% 缩减，仅主 context 占用） |
| 3 个深度任务 | ~45k tokens | 主~3k + 3×sub(释放) | 45k→3k |

> 注意：总 token 消耗（主+子）未减少——节省的是**主 context 占用**，让主 agent 可在更长工作流中持续工作而不被 context 窗口截断。

---

## 九、与 orchestrator 的协作协议

```
orchestrator dev_loop:
  Worker 完成 → deep-review Phase 4（传入 Worker 产出路径 + VC 路径）
  
deep-review Phase 4:
  路由判定 → 执行审查+验证 → 输出诊断 JSON
  
orchestrator 消费诊断 JSON:
  status=pass → contract-validator
  status=needs_fix → resume 原 Worker, fix_iterations++
  status=blocked → 记录 blocked, 继续不依赖的后续任务

orchestrator 不直接调用外部审查 agent——代码审查统一经 deep-review Phase 4，内部 spawn Explore subagent 执行只读审查。
```

---

## 十、skip / status 触发短语

### 跳过验证

用户在对话中输入 `deep-review:skip` 触发短语，AI 识别后跳过 Phase 4：

适用场景：
- 配置文件微调（<5 行）
- 纯样式小改动（改颜色/间距）
- 文档/记忆读写

**AI 不得自行决定跳过**。每次 skip 应记录原因。

### 查看状态

用户在对话中输入 `deep-review:status` 触发短语，AI 输出当前验证摘要：

```markdown
## 验证状态

进度：已完成 7/10 任务
通过：✅ 5 项 L1 / ⚠️ 3 项 L2 / ❌ 4 项需人验证
blocked：🔴 2 项（T3 批量导出、T4 导出报表）
下一步：T8 → T9 → T10
```

> ⚠️ 这些是**自然语言触发短语**（用户在对话中输入，AI 识别后执行），不是 Claude Code Skill 子命令。
