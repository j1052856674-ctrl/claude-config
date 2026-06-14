# PRD 视觉产出蓝图模板结构 v1.0

> **版本说明**：本文件定义视觉产出蓝图的章节结构、字段定义和生成规则。AI 生成蓝图时严格按此模板结构执行，确保产出物的一致性和可审查性。
>
> **产出路径**：`prd/[项目名]-visual-blueprint.md`

---

## §0 共享定义

共享定义只写一次，§A 和 §B 通过 ID 引用，避免重复描述。

### 0.1 模块清单

| 模块ID | 模块名称 | 模块类型 | 所属层级 | 描述 |
|--------|---------|---------|---------|------|
| m_xxx | ... | 功能模块/能力模块/数据模块 | 应用层/中台层/底层 | ... |

### 0.2 角色/系统清单

| 角色ID | 名称 | 类型 | 描述 |
|--------|------|------|------|
| r_xxx | ... | 角色/系统 | ... |

### 0.3 数据源清单

| 数据源ID | 名称 | 来源系统 | 数据内容 | 接口方向 |
|----------|------|---------|---------|---------|
| ds_xxx | ... | ... | ... | 上行/下行/双向 |

---

## §A Drawio 图纸蓝图

### A0 图例说明（Drawio 通用）

#### 节点形状映射

| 节点类型 | drawio 形状 | Mermaid 语法 | 配色(bg/border) | 尺寸(w×h) |
|---------|------------|-------------|-----------------|----------|
| start | rounded=1;arcSize=50 | A(([开始])) | #d5e8d4/#82b366 | 120×50 |
| process | rounded=0 | B[步骤名] | #dae8fc/#6c8ebf | 130×50 |
| decision | rhombus | C{判断?} | #fff2cc/#d6b656 | 140×70 |
| subprocess | rounded=1;double=1 | D[[子流程]] | #e1d5e7/#9673a6 | 130×50 |
| end_pass | rounded=1;arcSize=50 | E(([通过])) | #d5e8d4/#82b366 | 120×50 |
| end_reject | rounded=1;arcSize=50 | F(([拒绝])) | #f8cecc/#b85450 | 120×50 |
| v2_new | 同父类型 | — | #fed7aa/#f97316 | 同父类型 |

#### 连线样式映射

| 连线类型 | drawio style | 标签位置 | 适用场景 |
|---------|-------------|---------|---------|
| 实线（主流程） | orthogonalEdgeStyle;rounded=1;dashed=0 | 垂直线→右侧(y=1)；水平线→上方(y=-2) | 主流转、上层调用下层 |
| 蛇线（虚线） | orthogonalEdgeStyle;rounded=1;dashed=1 | 同上 | 数据回传、降级、异步触发 |
| 双向实线 | dashed=0;startArrow=standard;endArrow=standard | 中间 | 请求+响应同通道 |

#### 架构图线型规则（重中之重）

口诀：**下发调用实线、返回数据蛇线**

| 线型 | 方向 | 含义 | 示例 |
|------|------|------|------|
| 实线箭头 → 自上而下 | 上层→下层 | 主动调用、服务请求、指令下发 | 应用层→中台层→底层 |
| 蛇线箭头 → 自下而上 | 下层→上层 | 数据回传、结果返回、数据同步 | 底层→中台层（原始数据同步）；中台层→应用层（AI决策结果回传） |

**禁止**：同层之间不能用蛇线（同层交互用实线双向箭头）。

#### 层级容器映射

| 元素 | drawio 形状 | 配色 | 用途 |
|------|------------|------|------|
| 层级大框 | swimlane;startSize=30;rounded=1 | 各层bg/border色 | 架构图分层容器 |
| 分组小框 | rounded=1;strokeColor=none | 父层级bg的淡化版 | 同层业务域分组 |
| 泳道列 | swimlane;startSize=30;horizontal=0 | 浅灰bg | 泳道图竖列容器 |

#### 各图纸线型规则对比

| 图纸类型 | 实线用途 | 蛇线用途 | 禁止 |
|---------|---------|---------|------|
| 架构图 | 上层→下层调用 | 下层→上层回传 | 同层不能用蛇线 |
| 业务流程图 | 主流程步骤流转 | 异常/降级/条件分支 | 不能只画实线忽略异常分支 |
| 泳道图 | 同步接口调用 | 异步MQ/事件触发 | 跨泳道必须画线不能漏 |

### A1 产品架构图蓝图

**图纸类型**: 产品架构图
**版本**: 汇报版 / 技术落地版（二选一或两版都生成）
**配色方案**: prd_standard_3layer（引用 color-schemes.json）

#### A1.1 层级定义

| 层级ID | 层级名称 | 排列顺序 | 配色方案(bg/border) | 包含模块ID列表 |
|--------|---------|---------|---------------------|--------------|
| L_app | 应用层（用户交互层） | 1(最上) | #d1fae5/#10b981 | m_borrow, m_dialog, m_apply |
| L_mid | 能力中台层 | 2 | #fef3c7/#f59e0b | m_ai_agent, m_risk, m_tactics |
| L_data | 数据&交易底层 | 3(最下) | #ede9fe/#8b5cf6 | m_user_db, m_sku_db, m_order |

#### A1.2 节点定义

| 节点ID | 节点名称 | 节点类型 | 所属层级ID | 所属分组 | 描述 |
|--------|---------|---------|-----------|---------|------|
| n_xxx | ... | process/decision/start/end | L_xxx | 业务域分组名 | ... |

#### A1.3 连线定义（仅技术落地版填写）

| 连线ID | 起点节点ID | 终点节点ID | 线型(实线/蛇线) | 标签 | 描述 |
|--------|-----------|-----------|----------------|------|------|
| e_xxx | n_src | n_tgt | 实线/蛇线 | ... | 上层调用下层 / 下层回传上层 |

> **版本说明**：汇报版此节留空（无连线），仅技术落地版填写连线定义。

#### A1.4 布局策略

| 参数 | 值 |
|------|------|
| 排列方向 | TB（自上而下） |
| 层级间距 | 80px |
| 同层模块间距 | 40px |
| 分组框padding | 20px |
| 分组框间距 | 50px |

### A2 业务流程图蓝图

**图纸类型**: 业务流程图
**业务名称**: [单一主业务名称，如"借款申请→风控→回捞全链路"]
**配色方案**: flowchart_symbols

#### A2.1 节点定义

| 节点ID | 名称 | 类型(start/process/decision/end_pass/end_reject) | 分支出口(仅decision) | 描述 |
|--------|------|------|---------------------|------|

#### A2.2 连线定义

| 连线ID | 起点→终点 | 标签 | 线型(实线/蛇线) | 描述 |
|--------|----------|------|----------------|------|

#### A2.3 异常分支清单

| 异常场景 | 处理方式 | 起点节点 | 终点节点 | 线型 |
|---------|---------|---------|---------|------|
| 大模型超时 | 降级转人工 | s_ai_follow | s_manual | 蛇线 |
| 数据平台异常 | 缓存兜底 | s_risk_check | s_cache | 蛇线 |

### A3 BPMN 泳道流程图蓝图

**图纸类型**: BPMN泳道流程图
**配色方案**: flowchart_symbols
**排列方向**: LR（竖泳道每系统一列）

#### A3.1 泳道列定义

| 泳道ID | 名称 | 类型(角色/系统) | 排列位置(第N列) | 对应角色ID | 描述 |
|--------|------|---------------|----------------|-----------|------|

#### A3.2 步骤定义

| 步骤ID | 名称 | 类型 | 所属泳道ID | 行位置 | 对应模块ID | 描述 |
|--------|------|------|-----------|-------|-----------|------|

#### A3.3 跨泳道连线定义

| 连线ID | 起点→终点 | 标签 | 接口名 | 线型(实线=同步调用/蛇线=异步MQ) | 描述 |
|--------|----------|------|--------|-------------------------------|------|

---

## §B 前端 Demo 蓝图

### B1 页面清单与导航

#### B1.1 页面清单

| 页面ID | 页面名称 | 路由路径 | 页面类型(主功能页/表单页/状态页/结果页/列表页) | 核心功能 | 对应模块ID |
|--------|---------|---------|---------------------------------------------|---------|-----------|

#### B1.2 导航地图

| 起始页ID | 目标页ID | 触发方式(点击/提交/系统推送/自动跳转) | 触发元素ID | 条件 | 说明 |
|---------|---------|--------------------------------------|-----------|------|------|

### B2 每页完整规格

每个页面一节，包含：页面描述、布局结构、组件清单、交互事件。

#### B2.X [页面ID] [页面名称]

**页面描述**: [一段话描述页面核心用途和用户场景]

**布局结构**:

| 区域ID | 区域名称 | 占比 | 排列(左侧/右侧/顶部/底部/居中) | 描述 |
|--------|---------|------|-------------------------------|------|

**组件清单**:

| 组件ID | 组件名称 | 组件类型 | 所在区域ID | 风格描述 | icon名称 | 数据源ID | 关联交互ID |
|--------|---------|---------|-----------|---------|---------|---------|-----------|

**交互事件**:

| 交互ID | 触发组件ID | 触发方式(点击/输入/滚动/系统推送) | 行为描述 | 目标(页面ID/当前页/弹窗) | 条件 | 反馈(视觉变化/提示文案) |
|--------|-----------|-------------------------------|---------|------------------------|------|----------------------|

### B2 组件类型说明表（蓝图通用参考）

| 组件类型 | 通用特征 | 默认风格 |
|---------|---------|---------|
| Button | 单击触发操作 | 圆角8px，主色实心，hover微亮 |
| TextInput | 单行文本输入 | 圆角8px，边框#e2e8f0，focus高亮主色 |
| TextArea | 多行文本输入 | 同TextInput，高度自适应 |
| ScrollList | 纵向滚动列表 | 每项间距12px，divider浅灰线 |
| InfoCard | 信息展示卡片 | 白底圆角12px，阴影0 2px 8px，内边距16px |
| ScoreDisplay | 数值+进度条 | 数字24px粗体 + 环形/条形进度 |
| ButtonGroup | 横排按钮组 | 间距8px，按钮宽度自适应 |
| StatusTag | 状态标签 | 圆角4px小标签，通过绿/拒绝红/限额橙 |
| Dialog | 弹窗对话 | 居中遮罩+白底卡片，圆角16px |
| Toast | 提示消息 | 底部浮动，3秒自动消失 |
| NavBar | 顶部导航栏 | 固定顶部，返回按钮+页面标题 |
| FormSection | 表单区块 | 白底卡片内嵌表单项 |
| Select | 下拉选择 | 圆角8px，选项列表弹出 |
| DatePicker | 日期选择 | 圆角8px，日历弹出 |
| Tabs | 标签页切换 | 顶部标签条，选中态下划线 |
| Table | 数据表格 | 标头灰底，行间divider |
| Chart | 图表展示 | 对应图表库渲染 |
| EmptyState | 空状态占位 | 居中icon+描述文案 |
| Loading | 加载状态 | 居中旋转动画或骨架屏 |

### B3 设计系统参考

**配色方案**: 引用 knowledge/diagrams/color-schemes.json → prd_standard_3layer + flowchart_symbols
**字体栈**: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif
**排版规则**: 引用 prompts/html-output.md 排版纪律（行高1.75 / text-balance / tabular-nums / 对比度≥4.5:1）

#### B3.1 语义配色

| 用途 | 背景色 | 边框/文字色 | 场景 |
|------|--------|-----------|------|
| 主色调(强调) | #f59e0b | #d97706 | 关键操作按钮 |
| 成功/通过 | #10b981 | #059669 | 审批通过标签 |
| 拒绝/失败 | #ef4444 | #dc2626 | 拒绝标签、错误提示 |
| AI相关 | #8b5cf6 | #7c3aed | AI消息底色 |
| 信息展示 | #3b82f6 | #2563eb | 数据展示 |
| 背景辅助 | #f8fafc | #e2e8f0 | 页面背景、分割线 |
| 文字主色 | — | #1e293b | 正文标题 |
| 文字辅助 | — | #64748b | 描述、placeholder |

#### B3.2 icon 规范

**icon 库**: Lucide Icons（轻量、线条风格、和阿里云简约风格匹配）
**icon 尺寸**: 按钮24px，卡片标题20px，标签16px

| 用途 | icon名称 | 说明 |
|------|----------|------|
| 发送 | send / paper-plane | 对话发送按钮 |
| 用户 | user | 用户画像卡片 |
| 金钱 | wallet / banknote | 借款申请按钮 |
| 盾牌 | shield | 风控评分 |
| 聊天 | message-circle | 继续跟进 |
| 电话 | phone | 转人工 |
| 完成 | check-circle | 标记完成 |
| 返回 | arrow-left | 导航返回 |

#### B3.3 间距网格

| 场景 | 数值 |
|------|------|
| 页面内边距 | 24px |
| 区域间距 | 16px |
| 组件间距 | 12px |
| 表单项间距 | 8px |
| 卡片内边距 | 16px |
| 按钮组间距 | 8px |

---

### B4 前端原型对接规则

> §B 蓝图数据作为 Step 6 前端原型的唯一结构化输入，前端 skill 严格按以下映射规则消费。

#### B4.1 消费链路

```
蓝图 §B
  ├── B1.1 页面清单 ────────→ frontend /frontend shape → 页面路由结构
  ├── B2.X 组件清单 ───────→ frontend /frontend init  → 组件填充
  ├── B2.X 交互事件 ───────→ 前端交互实现（onclick/submit等）
  ├── B3 设计系统 ─────────→ ui-ux-pro-max --design-system → MASTER.md
  └── B1.2 导航地图 ───────→ 页面间路由/跳转实现
```

#### B4.2 页面清单 → 页面路由

| 蓝图字段 | 前端映射 | 说明 |
|---------|---------|------|
| 页面ID (P01/P02/P03) | 页面文件名 | `P01.html` / `P02.html` 或 SPA 路由 |
| 页面名称 | `<title>` / 页面标题 | 顶部 nav 显示 |
| 路由路径 | `href` / `route` | 跳转目标 |
| 页面类型 | 模板选择 | 表单页→form template；状态页→status template |

#### B4.3 布局结构 → 页面骨架

| 蓝图字段 | 前端映射 | 说明 |
|---------|---------|------|
| 区域ID | section wrapper class/id | `#area-query`, `#area-result` |
| 区域名称 | aria-label / 注释 | 无障碍属性 |
| 占比 | CSS flex/grid 比例 | `flex: 2 1` / `grid-template-columns: 40% 1fr` |
| 排列 | flex-direction / grid | 左侧→row；顶部→column；居中→flex+justifyCenter |
| 描述 | 不映射到代码 | 辅助AI理解用途 |

#### B4.4 组件清单 → 前端组件

| 蓝图组件类型 | 前端实现 | 说明 |
|-------------|---------|------|
| Button | `<button>` / 框架组件 | 圆角8px，主色实心，hover微亮 |
| TextInput | `<input type="text">` + `<label>` | aria-label + label for |
| TextArea | `<textarea>` | 同TextInput，高度自适应 |
| ScrollList | `<ul>` / 滚动容器 | 每项间距12px，divider浅灰线 |
| InfoCard | `<div class="card">` | 白底圆角12px，阴影0 2px 8px，内边距16px |
| ScoreDisplay | 自定义组件 | 数字24px粗体 + 环形/条形进度 |
| ButtonGroup | `<div class="btn-group">` + `<button>` | 间距8px，按钮宽度自适应 |
| StatusTag | `<span class="tag">` | 圆角4px小标签，绿/红/橙 |
| Dialog | `<dialog>` / modal 组件 | 居中遮罩+白底卡片，圆角16px |
| Toast | toast 组件 / 自定义 | 底部浮动，3秒自动消失 |
| NavBar | `<nav>` + `<a>` | 固定顶部，返回按钮+页面标题 |
| FormSection | `<fieldset>` / `<section class="form-section">` | 白底卡片内嵌表单项 |
| Select | `<select>` / 下拉组件 | 圆角8px，选项列表弹出 |
| DatePicker | date input / 日期组件 | 圆角8px，日历弹出 |
| Tabs | tab 组件 | 顶部标签条，选中态下划线 |
| Table | `<table>` / 表格组件 | 标头灰底，行间divider |
| Chart | chart.js / echarts / 图表组件 | 对应图表库渲染 |
| EmptyState | `<div class="empty-state">` | 居中icon+描述文案 |
| Loading | 骨架屏 / spinner | 居中旋转动画或骨架屏 |

#### B4.5 交互事件 → 前端事件绑定

| 蓝图字段 | 前端映射 | 说明 |
|---------|---------|------|
| 触发组件ID | `id` / `data-interaction` | 绑定事件监听器的目标元素 |
| 触发方式 | event type | 点击→click；输入→input/change；滚动→scroll |
| 行为描述 | handler 函数体 | 描述执行的逻辑 |
| 目标 | 页面路由 / 弹窗 | 跳转→`window.location.href`；弹窗→`dialog.showModal()` |
| 条件 | if 判断 | 前置条件判断 |
| 反馈 | toast / 视觉变化 | toast提示 / CSS类切换 |

#### B4.6 设计系统 → 全局样式变量

```css
:root {
  --color-primary: #f59e0b;
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-ai: #8b5cf6;
  --color-info: #3b82f6;
  --color-bg: #f8fafc;
  --color-text: #1e293b;
  --color-text-secondary: #64748b;
  --space-page: 24px;
  --space-area: 16px;
  --space-component: 12px;
  --space-item: 8px;
  --font-stack: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
  --shadow-card: 0 2px 8px rgba(0,0,0,0.08);
}
```

#### B4.7 导航地图 → 路由配置

```js
// 单页应用（SPA）
const routes = [
  { path: '/query', component: P01QueryPage },
  { path: '/report', component: P02ReportPage },
  { path: '/chat', component: P03ChatPage }
];

// 多页应用（MPA）
// <a href="/query.html"> → 直接跳转
// 按钮点击：onclick="location.href='/report.html'"
// 弹窗：dialog.showModal()
```

#### B4.8 蓝图 → OpenPencil 可选补充

当用户需要设计稿时，§B 蓝图数据按 `standards/openpencil-spec.md` 的映射规则，转换为 PenNode JSON 并生成 `.op` 设计文件。详见该文件。

---

1. §0 模块清单必须与 PRD §2.2 架构描述完全一致
2. §A 节点/连线定义必须覆盖完整链路（含异常分支）
3. §A 架构图线型严格遵循：**下发调用实线、返回数据蛇线**
4. §B 页面清单必须覆盖架构图应用层所有功能入口
5. §B 组件清单必须包含类型、风格、icon、数据源、关联交互
6. 蓝图生成后提示用户审查，确认后再进入 Step 4

---

## 与现有规范体系的关系表

| 现有文件 | 蓝图中的对应 | 关系 |
|---------|-------------|------|
| `standards/diagram-spec.md` | §A 章节结构 | 蓝图遵循 diagram-spec 定义的4大类图纸规范 |
| `standards/flowchart-guidelines.md` | §A 布局策略 | drawio 生成时遵循 guidelines 的间距/连线规则 |
| `knowledge/diagrams/color-schemes.json` | §A 配色引用 | 蓝图引用配色方案名，生成时读取具体色值 |
| `templates/shared/interaction-spec.md` | §B 组件交互 | 蓝图 B2 交互事件格式参考 interaction-spec |
| `templates/shared/agent-spec.md` | §B 对话组件 | AI对话页面引用 agent-spec 话术表 |
| `standards/html-style-standard.md` | §B 设计系统 | 前端 demo 生成时引用阿里云简约风格 |
| `prompts/html-output.md` | §B 排版规则 | 前端 demo 生成时引用排版纪律规则 |
