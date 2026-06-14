---
name: experience-format
description: worker-code 经验文件完整模板——踩坑触发条件、格式规范、分类维度和示例
metadata:
  type: knowledge
  agent: worker-code
  updated: 2026-06-12
---

# 经验沉淀格式规范

> 本文是 worker-code Prompt 中"经验沉淀"的完整模板和分类规范。

## 触发条件（必须记录）

以下任一情况 → 写入经验文件：

1. VC 自检 fail → 修复 > 1 次才通过
2. 遇到非预期行为（文档未覆盖/行为不一致/依赖库 bug）
3. 修复迭代 > 1 次
4. 工具/Skill 使用中发现陷阱
5. 同类 bug 再次出现（→ 升级已有经验文件，标注 recurrence）
6. 项目约定的编码模式与自身惯例冲突

**反触发**（不需要记录）：
- VC 自检一次 pass——正常完成，不需记录
- 简单拼写错误——lint 即可捕获
- 已知问题的标准修复——已在 lessons 中

## 文件路径

```
~/.claude/agent-memory/worker-code/lessons/EXP-{YYYYMMDD}-{简述}.md
```

- `YYYYMMDD`：记录日期
- `简述`：英文 kebab-case，≤30 字符，含关键名词（如 `amount-parse-scientific-notation`）

## 完整模板

```markdown
---
name: EXP-{YYYYMMDD}-{简述}
description: {一句话描述——出现在 MEMORY.md 索引中}
metadata:
  type: lesson
  agent: worker-code
  task_id: {关联任务ID，如 T-01}
  date: YYYY-MM-DD
  severity: critical | important | minor
  category: syntax | api | tooling | logic | dependency | convention
  recurrence: false | {指向之前的 EXP-xxx}
  bridge: true
---

# {标题}

## 发生了什么

{具体描述——什么操作、预期什么、实际什么}

## 根因

{为什么发生——理解偏差？文档缺失？库 bug？边界未覆盖？}

## 修正

{怎么修的——改了哪几行、用了什么替代方案}

## 防范

{如何避免同类问题——linter 规则？编码纪律补充？检查清单项？}
```

## 分类维度

| category | 典型场景 | 示例 |
|----------|---------|------|
| syntax | 语法错误/类型错误/隐式转换 | 科学计数法金额解析 |
| api | API 行为与文档不一致 | 返回格式与文档不匹配 |
| tooling | 工具链/构建/dep 问题 | go mod tidy 后破坏性变更 |
| logic | 业务逻辑理解偏差 | 状态机漏了中间态 |
| dependency | 第三方库问题 | 库版本冲突/breaking change |
| convention | 项目约定冲突 | 命名风格与项目不一致 |

## severity 判定

| severity | 判定标准 |
|----------|---------|
| critical | VC 断言 fail / 数据损坏风险 / 安全漏洞 / 修复 > 2 次 |
| important | 非预期但可 workaround / 效率显著降低 |
| minor | 已解决的小问题 / 记住即可避免 |

## 示例

### 完整示例

```markdown
---
name: EXP-20260612-amount-parse-scientific-notation
description: strconv.ParseFloat 无法解析科学计数法金额（1e3），改用 decimal 库
metadata:
  type: lesson
  agent: worker-code
  task_id: T-01
  date: 2026-06-12
  severity: critical
  category: syntax
  recurrence: false
  bridge: true
---

# 金额解析：科学计数法陷阱

## 发生了什么

修复支付回调金额校验 bug。输入金额 "1e3"（1000 的科学计数法）经 strconv.ParseFloat 解析后与回调金额比较失败，导致合法支付被拒绝。

## 根因

strconv.ParseFloat 能解析 "1e3"→1000.0，但项目其他地方用 fmt.Sprintf("%.2f") 格式化金额时输出 "1000.00"，比较时字符串不匹配。根本问题是金额解析不应使用科学计数法表示。

## 修正

1. 引入 `github.com/shopspring/decimal` 库
2. callback.go:127 `strconv.ParseFloat(amountStr, 64)` → `decimal.NewFromString(amountStr)`
3. 全部金额比较改用 `decimal.Decimal.Equal()`

## 防范

- 编码纪律第 5 条"常量不硬编码"扩展到"金融计算用 decimal，不用 float64"
- 金额字段校验增加正则：拒绝科学计数法格式，仅允许 `^\d+(\.\d{1,2})?$`
```
