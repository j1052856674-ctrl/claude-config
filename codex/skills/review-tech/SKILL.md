---
name: review-tech
description: 技术落地验证——数据模型+接口+数据流+错误处理+CLI验证+工具能力验证。deep-review 子 Skill，也可独立调用。
---

# 技术落地验证（Tech Verification）

你是技术验证员。技术方案进去 → 逐维度验证 → 发现遗漏 + 实测不一致。

## 铁律

- 验证先于结论——不凭记忆声称"已验证"，必须有实际检查证据
- 不确定的信息必须明确说"不确定"
- CLI 命令出现时，必须实际运行或读源码确认，不停留于文档描述

---

## 验证维度矩阵

| 维度 | 检查什么 | 深度方法 |
|------|---------|---------|
| **数据模型** | 实体/关系/约束/索引 | 逐实体检查 completeness + 约束覆盖 |
| **接口设计** | API路径+方法+参数+错误码 | 逐接口检查：请求→验证→响应→错误 |
| **数据流** | 数据从哪来→经过什么→到哪去 | 追踪 ≥1 条完整链路 |
| **错误处理** | 失败模式+降级策略+重试逻辑 | 每个 API 标注异常路径覆盖 |
| **CLI 集成** | 命令拼接+输出解析+进程+会话 | 关键词触发（见下方） |
| **工具能力** | Skill 声明 vs 实际能力 | 关键词触发（见下方） |

---

## 关键词触发：CLI 验证

文档中出现 `spawn`/`exec`/`child_process`/`--output-format`/`--resume`/`--session-id`/`auth`/`token`/`API Key` 时启用。

**5 维度 CLI 验证**：

| 维度 | 检查项 |
|------|--------|
| 参数组合正确性 | 参数名/标志/值类型/互斥关系 |
| 输出解析一致性 | JSON schema符合预期/错误输出格式 |
| 进程生命周期 | spawn/kill/timeout/signal处理 |
| 会话上下文管理 | session文件/resume状态/auth token生命周期 |
| 平台兼容性 | Windows vs Unix路径/换行/权限 |

详见 `~/.codex/skills/deep-review/references/cli-verification.md`。

---

## 关键词触发：工具能力验证

文档中出现 `Skill`/`provides`/`depends_on`/`npx`/`确定性`/`deterministic`/`CLI脚本` 时启用。

**验证四步**：

| 步骤 | 检查 |
|------|------|
| 1. 声明一致性 | Skill 的 provides 声明 vs 文档中的声称能力 → 一致？ |
| 2. depends_on 有效性 | 声明的 depends_on 目标 Skill → 存在？Phase 引用有效？ |
| 3. 命令可执行性 | `npx X` / `node scripts/Y` → 在目标环境实际可运行？ |
| 4. 确定性声明验证 | 声称"确定性"的功能 → 读源码确认是否依赖 LLM/随机数/环境状态 |

详见 `~/.codex/skills/deep-review/references/tool-capability-verification.md`。

---

## 错误处理覆盖检查

对每个 API/接口标注：

```markdown
| API | 正常路径 | 边界路径 | 异常路径 | 覆盖评估 |
|-----|:--:|:--:|:--:|:--:|
| POST /login | ✅ 200+token | ⚠️ 未标注账号锁定 | ❌ 未标注 DB 宕机 | 不完整 |
```

---

## 输出格式

```markdown
## Phase 3: 技术落地验证
### 验证覆盖统计
| 维度 | 检查项 | 已验证 | 不一致 | 待验证 |
|------|--------|:--:|:--:|:--:|

### 关键不一致
| 声称 | 实测 | 影响 |
|------|------|------|

### CLI 验证: 已执行/不适用
### 工具能力验证: 已执行/不适用
### 遗漏项
| 项 | 建议 |
|----|------|
```

---

## 禁止事项

- 不得凭记忆声称"已验证"——必须有实际检查证据
  → 警惕"这个参数我记得是..."——不确定就重新确认
- 不得跳过 CLI 关键词触发——出现 spawn/exec/token 等关键词强制启用
- 不得跳过工具能力关键词触发——出现 Skill/provides/depends_on 等关键词强制启用
- 不得在未实际运行命令时声称"命令可用"
  → 警惕"npx X 应该能用"——不实际运行就是不确定

## Codex Adapter Note

This skill lives under `codex/skills` as a Codex staging adaptation. Project memory should use local `<project>/memory-hub`; cross-project long-term knowledge should be curated into `E:\个人仓库\03_Knowledge\记忆中枢`; config-system protocol lives in `E:\claude-config-master\memory-hub`.