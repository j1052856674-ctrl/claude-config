---
name: dev-workflow
description: Use when executing code development tasks — feature implementation, bug fix, or any task requiring writing code. Not for note refinement, documentation, or knowledge management.
---

# dev-workflow：标准软件开发流程

> **铁律：不验证不输出。不设计不写前端。任何"看起来应该没问题"的断言判断都必须有实际运行证据支撑——运行了才能说pass，没运行就只能标"待验证"。前端任务必须调用 frontend-design Skill 确定视觉方案后才写实现代码——不先设计就直接写代码是前端开发最大的偷懒。**

## Red Flags（自我诊断）

| 你在想 | 你应该做 |
|---|---|
| "这个前端不需要设计，直接写代码" | STOP。前端任务必须调 frontend-design，不管多简单 |
| "自检一下VC就行了，不用实际运行" | STOP。必须调 verify/webapp-testing 实际运行验证 |
| "测试不重要，先写实现再说" | STOP。先写测试再写实现（TDD） |
| "代码写得够好了，不需要再检查" | 必须步骤5验证 + 步骤6 VC自检。两项互补不可跳 |
| "这条VC断言我凭经验判断pass" | STOP。必须实际运行验证。凭经验只能标"待验证" |
| "这个任务太简单，跳几步吧" | STOP。每步都走。简单任务每步更快，但不跳 |
| "前端设计太花时间了" | frontend-design 是方法论指导，3分钟确定方向，不是画原型 |

---

## 流程步骤（必须按顺序执行）

### 步骤1：读VC理解验收标准

- 使用 Read 工具读取 Validation Contract
- 逐条理解每个断言的验收条件
- 重点三类路径：正常路径、边界路径、异常路径

### 步骤2：理解任务上下文

- 使用 Read/Glob/Grep 读取相关代码文件、项目结构、AGENTS.md or CLAUDE.md
- 理解现有代码的模式、命名风格、依赖关系
- 确认修改范围——只改与任务直接相关的文件

### 步骤2a：前端设计（前端任务强制执行）

**判断条件**：任务涉及 UI 组件、页面、布局、样式 → 是前端任务

前端任务必须调用 `frontend-design` Skill：
- 确定视觉方向（色调、排版风格、交互模式）
- 在实现代码之前先确定设计方案
- **不可跳过**。即使"只是一个小按钮"也要先确定风格一致性

非前端任务（后端逻辑、数据处理、配置）→ 跳过步骤2a，直接进步骤3。

### 步骤3：写测试（调 TDD Skill）

调用 `superpowers:test-driven-development` Skill：
- 先写 failing test 定义预期行为
- 运行测试确认它 fail
- **跳过门槛**：只有纯配置修改（不改代码逻辑）可跳过此步骤，但必须在经验文件中记录跳过原因
- Bug修复任务：写回归测试确保同类bug不会再出现

### 步骤4：实现功能

- 写最小代码让步骤3的测试 pass
- 代码简化一次完成：写代码时直接做到简洁，不需要后续单独简化步骤
- 遵循项目现有代码风格和模式
- 不添加功能之外的重构或抽象
- 前端任务：按步骤2a的设计方案实现视觉细节

### 步骤5：验证行为（实际运行）

**这是铁律要求的核心步骤。不能仅靠"看代码觉得没问题"，必须实际运行。**

调用验证 Skill：
- 有浏览器交互 → 调用 `webapp-testing` Skill（Playwright截图+日志）
- 有可启动应用 → 调用 `verify` Skill
- 有测试套件 → 直接 Bash 运行（npm test / pytest 等）
- 无上述条件 → Bash 运行最小验证命令

**关键**：每条 VC 断言必须有运行证据。没运行 = 只能标"待验证"，不能标 pass。

### 步骤6：VC断言逐条自检

- 对照 VC 逐条检查产出是否满足断言
- 与步骤5互补：步骤5验证行为正确性，步骤6验证断言覆盖完整性
- 特别检查边界/异常路径断言是否被步骤5覆盖
- 发现未覆盖的断言 → 回步骤5补充验证

### 步骤7：输出结果

- 输出结果文件路径给编排者（只输出路径，不输出内容）
- 如有踩坑经验 → 写入经验文件（原因+修复+防范+任务编号）
- 如有跳过步骤3 → 在经验文件中记录跳过原因

---

## 适用场景判断

| 任务类型 | 适用 | 特殊处理 |
|---|---|---|
| 功能开发（写代码） | ✅ | 标准流程 |
| 前端UI开发 | ✅ | 步骤2a强制调 frontend-design |
| Bug修复（改代码） | ✅ | 步骤3写回归测试 |
| 配置修改 | ✅ | 步骤3可跳过（记录原因） |
| 笔记提炼 | ❌ | 用 knowledge-base |
| 文档编写 | ❌ | 直接执行 |
| 知识库整理 | ❌ | 用 knowledge-base |

---

## Skill 串联声明

- 步骤3 → superpowers:test-driven-development
- 步骤2a → frontend-design
- 步骤5 → verify 或 webapp-testing
- 步骤完成后 → 编排者启动 deep-review Phase 4 审查

---

## 禁止事项

1. 不得跳过步骤5（验证）直接输出
2. 不得跳过步骤2a（前端设计）直接写前端代码
3. 不得跳过步骤3（写测试）而不记录原因
4. 不得凭经验判断VC断言pass（必须有运行证据）
5. 不得在非代码任务上调用此 Skill
6. 不得用 Skill 调用替代 VC 自检
7. 不得在步骤4中添加任务范围之外的功能
## Codex Adapter Note

This skill lives under `codex/skills` as a Codex staging adaptation. Project memory should use local `<project>/memory-hub`; cross-project long-term knowledge should be curated into `E:\个人仓库\03_Knowledge\记忆中枢`; config-system protocol lives in `E:\claude-config-master\memory-hub`.