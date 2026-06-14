# HTML输出风格规范 v2.0 — Word-like 编辑 + 阿里云简约风格

> 所有 prd-v3 生成的 HTML PRD 文件必须遵循此风格规范。
> **v2.0 新增**：section-level contentEditable 编辑态样式、diagram tab 切换、zoom modal、底部 toolbar 行列按钮。
> 引用 `standards/html-editable-spec.md`（可编辑交互规格）、`standards/html-build-spec.md`（MD→HTML 构建规范）。
> drawio 样例参考：`E:/prd/examples/tapd-flowchart/tapd-flowchart-demo.drawio`

## 设计语言

**核心理念**：内容优先、功能导向、去除一切非必要装饰。让信息本身说话，而不是让包装抢戏。

## 颜色体系

### 主色

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色 | `#1890ff` | 阿里云蓝，用于按钮/链接/选中态/标题装饰 |
| 主色浅 | `#e6f7ff` | 主色10%透明度，用于hover背景/选中背景 |
| 主色深 | `#096dd9` | 主色深色，用于按钮hover/强调文字 |

### 文字色

| 层级 | 色值 | 用途 |
|------|------|------|
| 正文 | `#333333` | 正文、表格内容、描述文字 |
| 次要 | `#666666` | 说明文字、辅助标签、导航按钮默认态 |
| 辅助 | `#999999` | 提示文字、placeholder、时间戳、meta信息 |

### 背景与边框

| 用途 | 色值 | 说明 |
|------|------|------|
| 页面背景 | `#f5f5f5` | 极浅灰，不是纯白，避免刺眼 |
| 卡片/section背景 | `#ffffff` | 纯白 |
| 边框 | `#e8e8e8` | 通用边框色 |
| 边框轻 | `#f0f0f0` | 表格行分割线 |

### 风险语义色（与drawio样例对齐）

| 级别 | 色值 | 背景 | 用途 |
|------|------|------|------|
| 低风险/通过 | `#52c41a` | `#f6ffed` | badge、状态标签 |
| 中风险/警告 | `#faad14` | `#fffbe6` | badge、警告提示 |
| 高风险/拒绝 | `#f5222d` | `#fff1f0` | badge、阻断提示、P0标记 |
| 信息 | `#1890ff` | `#e6f7ff` | 信息提示、一般badge |

### 禁止使用的颜色

- 禁止紫色系：`#8b5cf6`, `#7c3aed`, `#6366f1`, `#a78bfa`
- 禁止渐变混合色：任何 `linear-gradient` 或 `radial-gradient`
- 禁止厚重深色：`#1a1a2e`, `#16213e` 等（商务深色背景）

## 字体

> 字体栈参考 `E:/prd/DataAgent_Architecture.html` 的风格：系统原生字体栈，不加装饰字体。
> 中文环境下 `PingFang SC` 和 `Microsoft YaHei` 是桌面端最佳选择，移动端回退到系统默认。

```css
--font-heading: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
--font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
--font-mono: "SF Mono", "JetBrains Mono", "Consolas", monospace;
```

| 元素 | 字号 | 字重 | 说明 |
|------|------|------|------|
| 大标题 | 24px | 600 | PRD标题，如"PRD — 用户洞察智能体" |
| 章标题 | 18px | 600 | section标题，如"1. 需求背景与目标" |
| 小标题 | 15px | 600 | 子节标题 |
| 正文 | 14px | 400 | 正文内容 |
| 表格 | 13px | 400 | 表格内文字 |
| 辅助 | 12px | 500 | meta信息、标签、badge |

## 排版纪律规则（从frontend skill提炼）

以下CSS属性是页面好看的关键，必须应用到所有HTML输出：

```css
/* 行高 — 中文正文1.75，标题1.3 */
body { line-height: 1.75; }
h1, h2, h3 { line-height: 1.3; }

/* 断行优化 — 防止标题/正文出现不均匀断行 */
h1, h2, h3, .section-title { text-wrap: balance; }
p, .editable { text-wrap: pretty; }

/* 数据对齐 — 表格中所有数字等宽对齐 */
td, .tabular-nums { font-variant-numeric: tabular-nums; }

/* 不人为修改字间距 — 中文排版依赖默认间距 */
body { letter-spacing: normal; } /* 禁止手动设值 */

/* v2.0: section-level contentEditable 编辑态 */
section[contenteditable] { outline: none; }
section[contenteditable]:hover { outline: 1px dashed oklch(80% 0.02 260); }
section[contenteditable]:focus { outline: 2px solid var(--accent, #1890ff); }
/* 🚨 编辑态禁止蓝色背景 — 只改变边框，不改变背景色 */

/* v2.0: 修改标记 — section blur时对比innerHTML，修改过的左侧蓝色竖线 */
section.modified { border-left: 3px solid var(--accent, #1890ff); }
```

## 间距体系（8px基准网格）

```css
--sp-1: 4px;
--sp-2: 8px;
--sp-3: 12px;
--sp-4: 16px;
--sp-5: 20px;
--sp-6: 24px;
--sp-8: 32px;
--sp-10: 40px;
```

## 卡片 / Section

```css
.section {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  /* ❌ 禁止 box-shadow */
}
```

- 圆角：8px（不超过10px）
- 边框：1px solid #e8e8e8
- 内边距：20px（正文区）/ 16px（卡片）
- **禁止 box-shadow** — 如需层次感，用边框色差异（hover时边框变#d9d9d9）

## 表格

```css
table { border-collapse: collapse; font-size: 13px; }
th { background: #fafafa; border-bottom: 2px solid #e8e8e8; font-weight: 600; padding: 10px 14px; }
td { border-bottom: 1px solid #f0f0f0; padding: 10px 14px; }
tr:hover td { background: #e6f7ff; }  /* 极浅蓝色hover */
```

- 无厚重背景色（th仅用#fafafa极浅灰）
- 行hover用主色浅(#e6f7ff)，不是整个行变色
- 最后一行无底边框

## 导航栏

```css
.nav {
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  padding: 12px 24px;
  position: sticky; top: 0;
  /* ❌ 禁止 box-shadow */
}
.nav-btn {
  padding: 6px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  background: #ffffff;
  color: #666666;
  font-size: 13px;
}
.nav-btn.active {
  background: #1890ff;
  color: #ffffff;
  border-color: #1890ff;
}
```

## Mermaid图表区

```css
.diagram-container {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  /* ❌ 禁止 box-shadow */
}
/* 图表在页面中最多占一半高度，超出滚动 */
.mermaid-wrap { max-height: 50vh; overflow-y: auto; }
```

## Diagram Tab 切换（v2.0 新增）

3图 tab group（架构图/流程图/泳道图），classDef 配色，非 active panel 不渲染 Mermaid。

```css
.diagram-tabs { display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid #e8e8e8; }
.diagram-tab {
  padding: 6px 16px; border: 1px solid #e8e8e8; border-bottom: none;
  border-radius: 4px 4px 0 0; background: #fafafa; color: #666666;
  font-size: 13px; cursor: pointer;
}
.diagram-tab.active { background: #ffffff; color: #1890ff; border-color: #1890ff #e8e8e8 #ffffff; }
.diagram-panel { display: none; }
.diagram-panel.active { display: block; }
```

### classDef 配色（与 drawio 样例对齐）

| Tab | 内容 | classDef 配色 |
|-----|------|-------------|
| 架构图 | 系统模块层级 | appLayer(#d1fae5/#10b981) midLayer(#ffedd5/#f97316) configLayer(#fefce8/#eab308) dataLayer(#ede9fe/#8b5cf6) |
| 流程图 | 用户操作全链路含异常分支 | process(#dbeafe/#3b82f6) decision(#fef3c7/#f59e0b) endpoint(#d1fae5/#10b981) error(#fecaca/#dc2626) |
| 泳道图 | 跨系统交互 | userStep(#ecfeff/#06b6d4) aiStep(#dbeafe/#3b82f6) dataStep(#ede9fe/#8b5cf6) configStep(#fefce8/#eab308) |

> 🚨 Mermaid v10 display:none Bug：必须 `startOnLoad:false` + 手动渲染 active panel。Tab 切换时 lazy render 未渲染 panel。详见 `html-editable-spec.md`。

## Zoom Modal（v2.0 新增）

双击 `.mermaid-wrap` → 弹出全屏 zoom modal，z-index 必须高于 topbar。

```css
.zoom-modal { display: none; position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.7); }
.zoom-modal.open { display: flex; align-items: center; justify-content: center; }
.zoom-content { background: #ffffff; border-radius: 8px; padding: 24px; max-width: 90vw; max-height: 90vh; overflow: auto; }
.zoom-close {
  position: absolute; top: 16px; right: 16px;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,.9); border: none; font-size: 20px;
  color: #333333; cursor: pointer;
}
```

## Badge（风险等级）

```css
.risk-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.risk-low { background: #f6ffed; color: #52c41a; }
.risk-medium { background: #fffbe6; color: #faad14; }
.risk-high { background: #fff1f0; color: #f5222d; }
```

## 底部工具栏（可编辑+导出+表格行列编辑）

```css
.toolbar {
  background: #ffffff;
  border-top: 1px solid #e8e8e8;
  padding: 12px 24px;
  position: sticky; bottom: 0; z-index: 110;
  display: flex; justify-content: space-between; align-items: center;
}
.toolbar-btn {
  padding: 6px 16px; border: 1px solid #e8e8e8; border-radius: 4px;
  background: #ffffff; color: #666666; font-size: 13px; cursor: pointer;
}
.toolbar-btn-primary { background: #1890ff; color: #ffffff; border-color: #1890ff; }
```

### 表格行列编辑按钮（v2.0 新增）

底部 toolbar 中的 `[+行][−行][+列][−列]` 按钮组，只在点击表格 TD 时显示。
检测方式：`click + closest('.ds-table td')`（🚨 禁止用 focusin，contentEditable 下焦点目标是 section 不是 TD）。
焦点保护：toolbar `mousedown preventDefault` 阻止焦点转移。

```css
.table-edit-btns { display: none; gap: 4px; align-items: center; }
.table-edit-btns.visible { display: flex; }
.table-edit-btns .toolbar-btn { font-size: 12px; padding: 4px 10px; }
```

## 响应式断点

- 768px以下：卡片单列、表格字体12px、导航按钮缩小
- 480px以下：进一步缩小间距和字号

## ❌ 完整禁止清单

| 禁止项 | 原因 |
|--------|------|
| `linear-gradient` / `radial-gradient` | 渐变是商务风，不是简约风 |
| `box-shadow` over `0 1px 2px rgba(0,0,0,0.06)` | 厚重阴影增加视觉噪音 |
| `border-radius` > 10px | 过大圆角失去专业感 |
| 紫色系配色(#8b5cf6等) | 紫色是"AI味"，不是"工具味" |
| `bounce`/`glow`/`pulse`动画(除save反馈) | 装饰性动画分散注意力 |
| `@keyframes` 用于非功能性反馈 | 同上 |
| `text-shadow` | 文字阴影是装饰 |
| `transform` 用于非交互反馈 | 3D变换是装饰 |
| Noto Serif SC等衬线字体 | 衬线字体偏文艺，不适合工具 |
| 图片/emoji作为section背景 | 增加噪音 |
| **v2.0**: `section[contenteditable]:focus` 设置 `background` | 编辑态只改边框，不改背景色 |
| **v2.0**: per-element `.editable` class | 改为 section-level contentEditable |
| **v2.0**: `focusin` 检测 TD | contentEditable 下焦点目标是 section，用 `click + closest()` |
| **v2.0**: Mermaid `startOnLoad:true` | tab 切换 UI 中 display:none 导致渲染失败 |