---
name: data-model-spec
description: 数据模型评审规范指引——枚举类型约束+前后端对齐+字段命名一致性+环形缓冲区建议
metadata:
  type: standard
---

# 数据模型评审规范指引

> 评审数据模型定义时遵循以下规范。适用于所有涉及后端/前端数据结构的技术文档。

---

## 核心规范

### 1. 禁用裸字符串表示状态/枚举

**❌ 错误**：用裸 String 表示状态或枚举值
```typescript
status: string  // ❌ 可以填任何值，类型系统无法约束
```

**✅ 正确**：用真正的 enum（后端）+ union type（前端）
```rust
#[derive(Clone, Serialize, Deserialize, Debug)]
pub enum WorkerStatus {
    #[serde(rename = "running")]
    Running,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "failed")]
    Failed,
}
```
```typescript
export type WorkerStatus = 'running' | 'completed' | 'failed' | 'stuck' | 'killed';
```

### 2. 后端↔前端字段对齐

逐字段对比后端和前端定义，确认以下项完全一致：
- 字段名（包括 serde rename 与 TS 字段名）
- 类型（Rust enum ↔ TS union type）
- 枚举值（serde rename 值 ↔ TS literal 值）
- nullability（Option<T> ↔ T | null）

**检查方法**：列出后端 struct 的每个字段，逐一对照前端 type/interface。

### 3. 字段命名一致性

- 同一概念在不同模块中使用相同字段名
- 日期字段统一命名（created_at / updated_at 或 created / updated，选定一种全局一致）
- ID 字段统一命名风格（snake_case 或 camelCase，选定一种全局一致）

### 4. 输出数据覆盖

数据模型应覆盖外部工具/CLI 输出的全部有用数据：
- token 用量/成本数据（usage / total_cost_usd / modelUsage）
- 执行耗时（duration_ms / duration_api_ms / ttft_ms）
- 循环次数（num_turns）
- 缓存命中（cache_read_input_tokens）

缺失这些字段 → 🟡（遗漏有用数据但不阻塞功能）

### 5. 输出缓冲策略

存储最近 N 行输出时，使用环形缓冲区（VecDeque / CircularBuffer）而非 Vec：
- Vec：无限增长 → 内存泄漏风险
- VecDeque：固定容量 → 丢弃最旧记录，内存可控

---

## 评审检查清单

- [ ] 状态/枚举使用真正的 enum + serde rename，不是裸 String
- [ ] 后端和前端每个字段名、类型、枚举值完全对齐
- [ ] CLI/API 输出的有用数据字段有对应模型字段
- [ ] 输出缓冲使用环形缓冲区而非无限 Vec
- [ ] 日期和 ID 字段命名风格全局一致
- [ ] Option<T> 与 T | null 对齐