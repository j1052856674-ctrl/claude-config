---
name: security-and-perf-patterns
description: code-reviewer 安全模式和性能反模式检查清单——审查时逐项对照
metadata:
  type: knowledge
  agent: code-reviewer
  updated: 2026-06-12
---

# 安全模式与性能反模式参考

> 本文是 code-reviewer 第二阶段（代码质量）中安全维度和性能维度的检查清单。
> deep-review Phase 4 提供方法论框架，本文提供具体检查项。

## 安全检查清单

### 认证与授权
- [ ] 每个需要认证的端点有 auth 中间件
- [ ] 权限检查在实际操作前（不是在操作后才检查）
- [ ] 无硬编码的 token/key
- [ ] session/token 有过期机制
- [ ] 注销后 token 失效（不只是客户端删除）

### 输入校验
- [ ] 所有外部输入（query/body/path param/header）有校验
- [ ] SQL/命令拼接处使用参数化查询
- [ ] 文件上传有大小和类型限制
- [ ] URL 重定向参数校验白名单（防 Open Redirect）
- [ ] 富文本/HTML 输入有 XSS 过滤

### 数据处理
- [ ] 密码不存明文，用 bcrypt/argon2
- [ ] 敏感字段不在日志/响应中输出
- [ ] 数据库查询有 LIMIT（防全表扫描）
- [ ] 批量操作有上限（防 DoS）

### 输出安全
- [ ] 错误响应不泄露内部信息（stack trace/db schema/内网IP）
- [ ] Content-Type 正确设置
- [ ] 敏感 API 的响应头有 `Cache-Control: no-store`

### 依赖与配置
- [ ] 无已知 CVE 的依赖版本
- [ ] 数据库连接串/密钥不在代码中
- [ ] 第三方 API key 在服务端使用不在前端暴露

## 性能反模式

### N+1 查询（最高频）
```go
// ❌ N+1: 循环内查数据库
for _, user := range users {
    orders := db.Query("SELECT * FROM orders WHERE user_id = ?", user.ID)
}

// ✅ 批量查询
ids := extractIDs(users)
orders := db.Query("SELECT * FROM orders WHERE user_id IN (?)", ids)
```

### 无界查询
```go
// ❌ 无 LIMIT
db.Query("SELECT * FROM logs")

// ✅ 有 LIMIT + 游标分页
db.Query("SELECT * FROM logs WHERE id > ? LIMIT 100", cursor)
```

### 不必要的数据传输
```go
// ❌ SELECT * 但只用 3 个字段
rows := db.Query("SELECT * FROM users")

// ✅ 按需取字段
rows := db.Query("SELECT id, name, email FROM users")
```

### 重复计算
```go
// ❌ 循环内重复计算
for _, item := range items {
    tax := price * 0.13  // 每次都算
}

// ✅ 提取到循环外
const taxRate = 0.13
```

### 串行可并行
```go
// ❌ 串行调 3 个独立下游
a := callServiceA()
b := callServiceB()
c := callServiceC()

// ✅ 并行调（如无依赖）
// 使用 goroutine + errgroup 或类似机制
```

### 缓存缺失
- [ ] 高频读取、低频变更的数据有缓存
- [ ] 缓存有 TTL 和淘汰策略
- [ ] 缓存穿透风险有防护（空值缓存/布隆过滤器）

## 检查优先级

审查时按以下顺序检查：

1. **安全漏洞**（触发条件：涉及认证/权限/支付/数据处理）→ 任何问题 = Critical
2. **N+1 查询**（触发条件：出现循环 + 数据库调用）→ Critical 或 Important
3. **无界查询/传输**（触发条件：SELECT/API 调用无 LIMIT）→ Important
4. **重复计算/串行可并行** → Minor 或 Important
