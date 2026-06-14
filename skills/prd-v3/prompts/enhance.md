# 内容增强行为规则

> 定义 Claude 在内容增强和智能补全时的行为规则。
> 核心原则：**补全标记可审查**，AI 自动补全内容标记 `[自动补全]`，用户始终可审查、修改或删除。
> 引用配置：`knowledge/templates/shared-index.json`、`knowledge/diagrams/color-schemes.json`、`knowledge/industry/risk-control-index.json`

---

## 自动补全触发条件

| 章节 | 触发条件 | 补全内容来源 |
|------|---------|-------------|
| 背景与目标 | 用户只写了目标但未写指标 | 从目标推导量化指标（如"提高审批效率" → 推导"审批时间减少30%"） |
| 需求描述 | 功能列表缺少交互规格 | 引用 `templates/shared/interaction-spec.md` 自动展开 |
| 安全合规 | 风控项目缺少安全章节 | 引用 `industry/risk-control/security-standards.md` 预填充 |
| 异常场景 | 缺少风险分析 | 引用 `templates/shared/risk-analysis.md` 预填充常见异常 |
| 数据需求 | 提到字段但未填12列 | 引用 `templates/shared/data-field-spec.md` 模板补全 |
| Agent对话 | 提到Agent但无对话设计 | 引用 `templates/shared/agent-spec.md` 预填充对话模式 |

---

## 补全标记规则

- 所有 AI 自动补全的内容必须在标题后标记 `[自动补全]`

- 补全内容示例格式：

  ```markdown
  ## 2.4 安全要求 [自动补全]

  | 要求类型 | 具体要求 | 验证方式 |
  |---------|---------|---------|
  | 数据脱敏 | 身份证号显示前3后4，中间用*替代 | 日志审计抽查 |
  | 权限隔离 | 运营人员仅可查看脱敏数据 | 权限矩阵验证 |
  ```

- 用户可选择：**保留补全内容**、**修改补全内容**、或**删除补全内容**重新手动填写

- 补全内容使用行业知识库的真实数据（如风控模块名、安全标准条目），而非泛泛描述

---

## 内容深度增强规则

1. **交互规格展开**：每个功能描述 → 检查是否有对应的交互规格（按钮/输入/列表/上传/反馈），缺少则引用 `templates/shared/interaction-spec.md` 展开

2. **架构图标准化**：每个架构图描述 → 检查节点形状和配色是否符合标准（引用 `knowledge/diagrams/color-schemes.json`），不符合则调整

3. **数据字段补全**：每个数据需求 → 检查是否有12列字段定义（引用 `templates/shared/data-field-spec.md`），缺少则补全模板

---

## 行业知识注入规则

- **风控项目** → 步骤3读模板后，额外 Read `industry/risk-control/` 下的相关文件（`common-modules.md` + `security-standards.md`）

- **通用项目** → 只注入通用交互规格和异常场景

- **注入时机**：步骤4内容增强阶段，而非步骤3模板生成阶段

> 行业知识索引文件：`knowledge/industry/risk-control-index.json`，通过索引定位具体知识文件路径。