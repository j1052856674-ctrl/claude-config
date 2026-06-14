---
name: coding-standards
description: worker-code 编码纪律详细执行标准——6条纪律的检查点、反例和执行边界
metadata:
  type: knowledge
  agent: worker-code
  updated: 2026-06-12
---

# 编码纪律执行标准

> 本文是 worker-code Prompt 中 6 条编码纪律的详细执行标准。
> Prompt 中的简表是摘要——本文是执行时的检查清单。

## 1. 日志带链路ID

**标准**：每条日志含请求/任务标识，确保跨函数/跨文件的日志可追踪。

**检查点**：
- [ ] 入口函数第一行从 context/参数提取 trace_id 或 task_id
- [ ] 所有 log 语句包含 trace_id 字段
- [ ] 异常捕获处保留 trace_id（不因 new error 丢失）
- [ ] 下游调用透传 trace_id

**反例**：
```go
log.Printf("user created")                    // ❌ 无链路ID
log.Printf("user %s created", req.UserID)     // ❌ 用户ID不是链路ID
```

**正例**：
```go
log.Printf("[%s] user %s created", traceID, req.UserID)  // ✅
```

## 2. 一个函数一件事

**标准**：函数名能一句话描述；需要"并且"→ 拆。

**检查点**：
- [ ] 函数名不含"和""与""and"等连词
- [ ] 函数体 ≤ 50 行（超过应审视）
- [ ] 嵌套深度 ≤ 3 层
- [ ] 单一职责：改函数行为不需要改无关逻辑

**反例**：
```go
func CreateAndNotifyUser(req) error { // ❌ 创建+通知=两件事
    // 创建用户...
    // 发邮件...
    // 更新统计...
}
```

**正例**：
```go
func CreateUser(req) (*User, error) { ... }       // ✅ 一件事
func NotifyUserCreated(user) error { ... }          // ✅ 一件事
```

## 3. 边界校验内部信任

**标准**：入口校验一次，内部不重复。信任内部调用者传合法值。

**检查点**：
- [ ] 每个外部入口（API handler/消息消费/文件读取）校验输入
- [ ] 内部函数不重复校验入口已验证的值
- [ ] 内部函数参数用值类型而非指针（表达"必填"语义）
- [ ] 对外部输入（用户输入/第三方API响应）永远不信任

**反例**：
```go
func handler(req) { validate(req); service.Create(req) }
func service.Create(req) { validate(req); repo.Save(req) }  // ❌ 重复校验
func repo.Save(req) { validate(req); db.Insert(req) }       // ❌ 三重校验
```

**正例**：
```go
func handler(req) { validate(req); service.Create(req) }
func service.Create(req) { /* 信任已校验 */ repo.Save(req) }
```

## 4. 异常不能吞

**标准**：catch 必须 log/throw/降级，禁止空 catch。

**检查点**：
- [ ] 所有 error 返回值被检查（用 linter 强制：`errcheck`）
- [ ] 吞掉的 error 必须 log（至少 WARN 级别）+ 带 trace_id
- [ ] 降级必须显式标注 `// degraded: <原因>`
- [ ] 禁止 `_ = err` 忽略（除非注释说明原因）

**反例**：
```go
result, _ := someCall()              // ❌ 忽略错误
if err != nil { }                    // ❌ 空 catch
if err != nil { return defaultValue } // ❌ 吞错无日志
```

**正例**：
```go
result, err := someCall()
if err != nil {
    log.Warnf("[%s] someCall failed, using fallback: %v", traceID, err)
    return fallbackValue  // degraded: someCall 超时时用缓存数据
}
```

## 5. 常量不硬编码

**标准**：端口/URL/阈值/超时/重试次数用配置项。

**检查点**：
- [ ] 无魔数（magic number）——数字常量有变量名
- [ ] 无硬编码 URL/端口
- [ ] 超时和重试次数从配置读取，有默认值
- [ ] 格式字符串（日期/金额格式）提取为常量

**反例**：
```go
time.Sleep(5 * time.Second)           // ❌ 魔数
resp, _ := http.Get("http://x:8080")  // ❌ 硬编码URL
for i := 0; i < 3; i++ { retry() }   // ❌ 硬编码重试次数
```

**正例**：
```go
const defaultRetryDelay = 5 * time.Second
time.Sleep(cfg.GetDuration("retry_delay", defaultRetryDelay))  // ✅
```

## 6. 命名表意图

**标准**：说"做什么"不说"怎么做"；不用缩写（除约定俗成）。

**检查点**：
- [ ] 函数名动词开头，说"做什么"（CreateUser，不说BuildUserRecord）
- [ ] 变量名回答"是什么"（activeUsers，不说tempList1）
- [ ] 不使用单字母变量（循环索引 i/j/k 除外）
- [ ] 缩写仅限：ID/URL/HTTP/JSON/XML/API/DB/SLA/CPU/IO

**反例**：
```go
func proc(d []byte) []byte { ... }  // ❌ 缩写+不表意图
var ul []User                        // ❌ ul = userList?
```

**正例**：
```go
func DecryptPayload(encrypted []byte) ([]byte, error) { ... }  // ✅
var activeUsers []User                                          // ✅
```

## 执行规则

- 6 条在每次代码产出前自检
- 违反任一条 → 修复后再提交
- 特殊场景无法遵守 → 在 lessons 中记录原因
