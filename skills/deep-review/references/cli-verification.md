---
name: cli-verification
description: Phase 3附加——CLI集成专用验证清单+常见失误模式提醒，当技术文档涉及外部CLI/API工具集成时加载
metadata:
  type: reference
  phase: 3-addon
---

# CLI 集成专用验证清单

> 此文件是 `phase3-tech-design.md` 的补充，仅在触发 CLI 关键词时加载。
> 当技术文档涉及外部 CLI/API 工具集成时，Phase 3 自动触发加载。
> 只定义验证方法，不定义结论。

---

## 加载条件（自动触发关键词）

当技术文档中出现以下任一关键词或概念时，此清单自动生效：

- **CLI 命令拼接**：`claude -p`、`--output-format`、`spawn`、`exec`
- **进程管理**：`child_process`、`Command::new`
- **外部 API 调用**：`fetch`、`HttpClient`
- **会话 / 恢复 / 认证**：`--resume`、`--session-id`、`auth`、`token`

---

## A. 命令构建验证

- [ ] 每个命令模板已实际运行验证（不报参数错误）
- [ ] 参数间隐含依赖已发现并标注（例如某输出格式 flag 必须搭配 verbose flag）
- [ ] 参数拼写与 `--help` 一致（不是凭印象写）
- [ ] 工作目录设置方式已验证（`--cwd` flag 还是 `current_dir()` 还是 shell cd）
- [ ] 权限/认证模式已明确指定（非交互模式默认权限模式是什么？）

---

## B. 输出流验证

- [ ] 输出格式参数的实际必需条件已验证（如 stream-json 是否需要 verbose）
- [ ] 实际输出事件类型的完整清单已列出（实际运行 3 种场景：简单文本、tool use、失败）
- [ ] message.content 内部子类型清单已列出（text / tool_use / thinking / tool_result）
- [ ] 内部 tool use 循环产生的交替事件已标注处理方式
- [ ] 初始化事件的 session_id 提取位置已标注
- [ ] 最终 result 事件的全部可用字段已列出（对比 Spec 数据模型是否遗漏）
- [ ] 输出流中的进度/增量事件有过滤或展示策略

---

## C. 进程行为验证

- [ ] 正常任务的 exit code 和 stop_reason 已实测确认
- [ ] 失败任务的 exit code 和 error 事件已实测确认
- [ ] kill 后的进程残留已检查（ps / tasklist）
- [ ] kill 方式覆盖目标平台（Windows: taskkill /T /F /PID xxx）
- [ ] stdin 管道关闭时机已说明（kill 前关闭？kill 后关闭？）
- [ ] stuck 检测基于 stdout 输出间隔而非纯 wall-clock 超时

---

## D. 会话机制验证

- [ ] session_id 在输出中的位置已标注（init 事件？result 事件？）
- [ ] session_id 在数据模型中有对应字段
- [ ] --resume 恢复上下文的行为已实测（恢复后 Claude 是否知道之前说了什么）
- [ ] --session-id 指定自定义 ID 已验证
- [ ] session 持久化行为已说明（默认保存到哪里，是否需要清理）
- [ ] Compaction 由工具内部处理，Spec 已说明对外影响

---

## E. 精简模式验证（如使用 --bare 或等价 flag）

- [ ] 精简模式禁用了哪些功能已列出（CLAUDE.md 发现、hooks、auto-memory 等）
- [ ] 精简模式对任务质量的影响已评估（项目上下文丢失 → 质量下降？）
- [ ] 精简模式对认证方式的限制已说明（keychain/OAuth 不可用？只能 API Key？）
- [ ] 如果不用精简模式，权限确认策略已定义（--permission-mode 或 --allowedTools）

---

## F. 多实例并发验证

- [ ] 多个 CLI 进程并行是否有冲突已测试
- [ ] 每个进程的工作目录是否独立
- [ ] 每个进程的 session_id 是否唯一
- [ ] 并发时的 stdout/stderr 读取是否有线程安全问题
- [ ] 并发数量上限（max_parallel）是否与实际性能匹配

---

## 常见失误模式

> ⚠️ 这是**陷阱提醒**，不是事实答案。
> 模式描述的是"评审者容易忽略什么类别的陷阱"，具体是否存在需要评审者自行验证。

---

### 模式 1：命令参数组合未实际验证

**表现**：Spec 写了一组 CLI 命令拼接模板，但作者没有实际运行验证过这组参数能否成功启动。

**常见遗漏**：
- 参数间隐含依赖（某个 flag 必须搭配另一个 flag，否则报错）
- 参数值约束（某些参数不接受空值、超长值、特殊字符）
- 必需但未提及的参数（只有去掉后才发现报错）

**验证方法**：复制 Spec 中的命令模板，实际执行一遍。

**识别信号**：Spec 中出现 `命令: xxx --flag1 --flag2 ...` 但没有 `[已验证]` 标注。

---

### 模式 2：输出格式假设与实际不符

**表现**：Spec 假设 CLI 输出是某种格式（如"每行一个简单 JSON"、"按 type 字段分为 assistant/result/system/error"），但实际输出更复杂。

**常见遗漏**：
- 嵌套结构（message.content 是数组而非单对象）
- 内部循环事件（CLI 自动执行 tool use，产出 user↔assistant 交替事件）
- 初始化事件（启动时有一条系统信息包含 session_id、工具列表等）
- 进度指示事件（思考 token 增量等）
- 子类型区分（同一种 type 下有不同 subtype 或 content 内部不同 type）

**验证方法**：实际运行命令 + 输出格式参数，捕获完整输出，列出所有实际出现的 type/subtype。

**识别信号**：Spec 的解析逻辑描述的是"逐行读取 → 根据 type 字段分类 → 映射到日志级别"，但实际上同一行可能是嵌套结构或包含多种子类型。

---

### 模式 3：进程生命周期假设过于简化

**表现**：Spec 的数据流假设是"spawn → 输出 → 进程退出 → 状态更新"，但实际进程行为更复杂。

**常见遗漏**：
- 进程内部多轮循环（一个调用可能执行多次 tool use）
- 子进程创建（CLI spawn 可能产生子进程，kill 父进程不等于 kill 整个进程树）
- stdin 管道影响（关闭 stdin 可能导致进程行为不同）
- 平台差异（Windows 的 taskkill /T vs Unix 的 kill -TERM 行为不同）
- 信号传递差异（SIGTERM 在 Windows 上无直接等价）

**验证方法**：实际 spawn 进程 → 观察完整生命周期 → 尝试各种 kill 方式 → 检查残留。

**识别信号**：Spec 的 kill 逻辑只有 `child.kill()` 或简单的 `taskkill /F /PID`，没有进程树清理（`/T` flag）。

---

### 模式 4：会话管理链路不完整

**表现**：Spec 定义了 Worker/Session 的生命周期，但没有打通"如何提取外部 session_id → 如何存储 → 如何用于恢复"的完整链路。

**常见遗漏**：
- session_id 提取：从 CLI 输出中提取 session_id（init 事件和 result 事件都有）
- session_id 存储：WorkerInfo 数据模型是否有 claude_session_id 字段
- session_id 使用：后续如何用 --resume 恢复上下文继续任务
- Compaction 说明：上下文压缩机制是 CLI 内部处理的，Spec 是否说明了这一点
- session 清理：kill Worker 时，CLI 的 session 文件是否需要清理

**验证方法**：运行 CLI → 检查输出中 session_id 的位置 → 尝试 --resume → 检查 ~/.claude/ 目录。

**识别信号**：Spec 中 Worker/Session 的数据模型没有 `session_id` 字段，或没有 `--resume` 的使用场景。

---

### 模式 5：权限/认证/模式选择未明确

**表现**：Spec 在非交互模式下使用 CLI，但没有说明权限策略和认证方式。

**常见遗漏**：
- 权限模式选择（default 需要 interactive confirmation，非交互模式必须指定其他模式）
- 认证方式（API Key vs OAuth vs keychain，不同场景的可用性不同）
- 精简模式（--bare 等）的副作用（禁用项目上下文加载、认证方式限制等）

**验证方法**：实际运行 Spec 命令但不加权限参数 → 观察是否弹窗/阻塞 → 加权限参数后再验证。

**识别信号**：Spec 使用 `-p/--print` 但没有 `--permission-mode` 或 `--dangerously-skip-permissions`。

---

### 模式 6：数据模型与实际输出字段不对齐

**表现**：Spec 定义了 Rust/TS 数据模型，但字段没有覆盖 CLI 输出的全部有用数据。

**常见遗漏**：
- token 用量/成本数据（result 事件包含 usage、total_cost_usd、modelUsage）
- 执行耗时数据（duration_ms、duration_api_ms、ttft_ms）
- 内部循环次数（num_turns）
- 缓存命中数据（cache_read_input_tokens）

**验证方法**：对比 Spec 的 WorkerInfo/LogEntry 字段与 CLI result 事件的字段列表。

**识别信号**：Spec 的数据模型没有 cost/token/duration 类字段，或 LogEntry 的 source/level 分类与实际输出的 type 体系不对应。

---

### 模式 7：状态映射与实际 exit behavior 不对齐

**表现**：Spec 定义了 Worker 状态（running/completed/failed/stuck/killed/idle），但映射规则与 CLI 实际行为不完全匹配。

**常见遗漏**：
- `-p` 模式下不存在 "idle" 状态（CLI 自动完成，不会暂停等待输入）
- exit code = 0 映射 completed，但某些"成功但有警告"的场景可能需要区分
- stuck 检测基于纯超时 vs 基于无输出时间——后者更准确
- kill 时的状态转换顺序：先标记 killing → 等进程退出 → 标记 killed

**验证方法**：运行各种任务（成功、失败、超时），观察 CLI 退出行为和 result 事件的 stop_reason/subtype。

**识别信号**：Spec 的状态枚举包含 `-p` 模式下不可能出现的状态（如 idle），或 stuck 检测逻辑是纯超时而非基于输出时间。

---

## 使用说明

此文件是 `phase3-tech-design.md` 的补充，仅在触发 CLI 关键词（如 `claude -p`、`--output-format`、`spawn`、`exec`、`child_process`、`Command::new`、`fetch`、`HttpClient`、`--resume`、`--session-id`、`auth`、`token` 等）时加载。
