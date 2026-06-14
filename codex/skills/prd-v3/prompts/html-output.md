# HTML输出行为规则 v2.0

> 定义Claude生成HTML格式PRD时的风格、可编辑和同步行为规则。
> **v2.0 核心变化**：从 per-element `.editable` 改为 section-level `contentEditable`（Word-like 整体编辑）。
> 引用 `standards/html-style-standard.md`（阿里云简约风格CSS规范）、`standards/html-editable-spec.md`（可编辑交互规格）、`standards/html-build-spec.md`（MD→HTML 构建规范）。

## 核心原则

1. **简约优先**：阿里云控制台风格 — 白底、蓝色主色、轻量卡片、无装饰。禁止渐变、厚重阴影、花哨动画。
2. **Section-level contentEditable**：整个 `<section contenteditable="true">` 像 Word 一样直接编辑——标题、段落、列表、表格单元格全部可编辑。不再使用 per-element `.editable` class。
3. **浏览器原生 Ctrl+Z**：撤销用浏览器原生逐字撤销，不自定义 undo handler。
4. **表格必须渲染为表格**：MD文件中的表格必须完整渲染为HTML `<table>`，保留所有列和所有行，不能压缩成卡片文字摘要。
5. **数据驱动同步**：编辑内容变更后导出JSON，Claude读取JSON按 section ID 同步更新MD文件和drawio文件。
6. **Mermaid为中间态**：架构图/流程图/泳道图的Mermaid渲染是预览态，最终交付drawio XML文件。Mermaid 3图用 tab 切换 + classDef 配色 + 双击弹窗放大。

## 排版纪律规则

生成HTML PRD时，必须遵循以下排版规则：

- **中文行高 1.75**（正文），标题行高 1.3
- **标题使用 `text-wrap: balance`** — 防止标题换行时出现不均匀断行
- **正文使用 `text-wrap: pretty`** — 优化最后一行断行
- **数据数字使用 `tabular-nums`** — 表格中数字等宽对齐
- **不人为修改 `letter-spacing`** — 中文排版依赖默认间距
- **中文字体栈**：`-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
- **文本对比度 ≥ 4.5:1**（WCAG AA标准）
- **触摸目标 ≥ 44px** — 按钮/链接点击区域

## 风格规范

**必须遵循** `standards/html-style-standard.md` 的阿里云简约风格。

## 页面结构模板（v2.0 Word-like）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>项目名 — PRD</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
  <!-- 1. Topbar — position:sticky;top:0;z-index:100 -->
  <header class="topbar">PRD标题 + 版本信息</header>

  <!-- 2. Sidebar — 章节导航，点击滚动到对应 section -->
  <nav class="sidebar">§1~§7 导航链接</nav>

  <!-- 3. Main — 所有 section 均为 contentEditable -->
  <main>
    <section id="s1" contenteditable="true">§1 内容（标题+段落+列表 全部可编辑）</section>
    <section id="s2" contenteditable="true">
      §2 内容（含 Mermaid 3图 tab group）
      <!-- Mermaid 图表区用 .diagram-container + .diagram-tabs + .diagram-panel -->
    </section>
    <section id="s3" contenteditable="true">§3 内容</section>
    <!-- ... s4 ~ s7 ... -->
  </main>

  <!-- 4. Footer Toolbar — position:sticky;bottom:0;z-index:110 -->
  <footer class="toolbar">
    <div class="toolbar-left">
      <span class="edit-stats">✏️ 已修改 0 处</span>
    </div>
    <div class="toolbar-center">
      <!-- 表格编辑按钮组 — 仅在点击表格TD时显示 -->
      <div class="table-edit-btns">
        <button class="toolbar-btn" data-action="add-row">+行</button>
        <button class="toolbar-btn" data-action="del-row">−行</button>
        <button class="toolbar-btn" data-action="add-col">+列</button>
        <button class="toolbar-btn" data-action="del-col">−列</button>
      </div>
    </div>
    <div class="toolbar-right">
      <button class="toolbar-btn toolbar-btn-primary" id="exportJson">导出变更 JSON</button>
    </div>
  </footer>

  <!-- 5. Zoom Modal — 双击 Mermaid 图表弹窗放大 -->
  <div class="zoom-modal" id="zoomModal">
    <button class="zoom-close">&times;</button>
    <div class="zoom-content" id="zoomContent"></div>
  </div>
</body>
</html>
```

## 可编辑机制（v2.0 — Section-level contentEditable）

**必须遵循** `standards/html-editable-spec.md`：

- 每个 `<section>` 加 `contentEditable="true"`，用户点击章节内任意位置即可编辑——标题、段落、列表、表格全部可编辑。
- **编辑态视觉**：`outline:2px solid #1890ff`（细蓝边框），🚨 **禁止蓝色背景**。
- **hover 提示**：`outline:1px dashed oklch(80% 0.02 260)`（浅灰虚线提示可编辑）。
- **变化追踪**：
  - focus 时记录 `sec.dataset.original = sec.innerHTML`
  - blur 时对比，修改过的 section 加 `sec.classList.add('modified')`（左侧蓝色竖线 `border-left:3px solid #1890ff`）
  - toolbar 显示 `✏️ 已修改 N 处`
- **撤销**：浏览器原生 Ctrl+Z 逐字撤销。**禁止自定义 undo handler**。
- **Escape**：取消当前编辑，恢复到 `dataset.original` 内容。

## 表格行列编辑（v2.0 新增）

**必须遵循** `standards/html-editable-spec.md` 表格行列编辑章节：

- 底部 toolbar 包含 `[+行][−行][+列][−列]` 按钮组，点击表格 TD 时通过 `classList.add('visible')` 显示。
- **🚨 检测方式**：`click + closest('.ds-table td')`，禁止用 `focusin`（contentEditable 下 focusin 目标是 section 不是 TD）。
- **🚨 焦点保护**：toolbar `mousedown preventDefault` 阻止焦点转移，禁止用 blur-delay 方案。
- 至少保留1行数据行，禁止删 header 行；至少保留1列。

## Mermaid Diagram 交互（v2.0 新增）

### 3图 Tab 切换

§2.2 架构图区域使用 3-tab diagram group：

| Tab | 内容 | classDef 配色 |
|-----|------|-------------|
| 架构图 | 系统模块层级 | appLayer(#d1fae5/#10b981) midLayer(#ffedd5/#f97316) configLayer(#fefce8/#eab308) dataLayer(#ede9fe/#8b5cf6) |
| 流程图 | 用户操作全链路含异常分支 | process(#dbeafe/#3b82f6) decision(#fef3c7/#f59e0b) endpoint(#d1fae5/#10b981) error(#fecaca/#dc2626) |
| 泳道图 | 跨系统交互 | userStep(#ecfeff/#06b6d4) aiStep(#dbeafe/#3b82f6) dataStep(#ede9fe/#8b5cf6) configStep(#fefce8/#eab308) |

### classDef 语法规则（🚨 强制）

**节点定义与连线必须分离**。`:::classDef` 只出现在节点定义行，不出现在连接行：

```
✅ 正确：
A([开始]):::endpoint
B["选择角色"]:::process
A --> B --> C --> D

❌ 错误：
A([开始]):::endpoint --> B["选择角色"]:::process
```

决策节点不加引号：`D{角色校验}`（不是 `D{"角色校验"}`）
端点节点不加引号：`A([开始])`（不是 `A(["开始"])`）

### 🚨 Mermaid v10 display:none Bug（强制规避）

Mermaid v10 无法在 `display:none` 容器中渲染。Tab 切换 UI 中非 active panel 是 `display:none`。

**必须使用 `startOnLoad:false`**，手动只渲染 active panel：

```js
mermaid.initialize({startOnLoad:false, ...});
// 只渲染当前可见的 active panel
var activePanel = document.querySelector('.diagram-panel.active');
if(activePanel){
  mermaid.run({nodes: activePanel.querySelectorAll('.mermaid:not([data-processed])')});
}
// Tab 切换时 lazy render
tab.addEventListener('click', function(){
  // 切换 active panel
  var unrendered = panel.querySelectorAll('.mermaid:not([data-processed])');
  if(unrendered.length > 0) mermaid.run({nodes: unrendered});
});
```

**禁止 `startOnLoad:true`** 在任何有 tab 切换 UI 的 HTML 中使用。

### 双击弹窗放大

- 图表容器 `max-height:50vh`（占页面最多一半高度）
- **双击** `.mermaid-wrap` → 弹出全屏 zoom modal
- modal：`position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.7)`
- 关闭：点击 ✕ / Esc / 点击背景
- zoom modal z-index 必须 > topbar z-index（200 > 100）

## 同步机制

编辑后的内容变更通过以下方式同步到MD和drawio文件：

1. **JSON导出**：section blur 自动对比 innerHTML，记录修改过的 section 的 original + current HTML
2. **导出按钮**：底部 toolbar "导出变更 JSON" 按钮，点击下载 JSON
3. **JSON格式**：
   ```json
   {
     "timestamp": "2026-06-08T10:30:00Z",
     "source": "用户洞察智能体-PRD.html",
     "prdTitle": "用户洞察智能体 — PRD",
     "changes": {
       "s1": {
         "id": "s1",
         "original": "<h2>...</h2><p>原始内容...</p>",
         "current": "<h2>...</h2><p>修改后的内容...</p>"
       }
     },
     "totalModified": 2
   }
   ```
4. **Claude同步流程**：
   - 用户编辑 HTML → 自动记录变化 → toolbar 显示 "✏️ 已修改 N 处"
   - 用户点击「导出变更 JSON」→ 下载 JSON
   - 用户把 JSON 粘贴给 Claude → Claude 按 section ID 定位 MD 对应章节 → 更新文字内容
   - 如变更涉及 Mermaid 图表 → Claude 更新 MD 中 Mermaid 代码 + 重新生成 drawio

## 🚨 Bug 模式警告（4个必避模式）

从实际迭代中提炼的 4 个反复出现的 bug 模式，每次生成 HTML 时必须检查：

### 1. contentEditable 父容器焦点检测陷阱

**现象**：需要检测用户点击了哪个 TD 来显示 toolbar 按钮，但 `focusin` 的 `e.target` 是 section（不是 TD）。
**正确方式**：`click + e.target.closest('.ds-table td')`
**禁止方式**：`focusin + e.target.tagName === 'TD'`

### 2. Mermaid v10 display:none Bug

**正确方式**：`startOnLoad:false` + 手动渲染 active panel + tab 切换时 lazy render
**禁止方式**：`startOnLoad:true`

### 3. mousedown preventDefault 阻止焦点转移

**正确方式**：`toolbar.addEventListener('mousedown', function(e){ e.preventDefault() })`
**禁止方式**：`keepToolbar` flag + `setTimeout(150ms)` 焦点竞态方案

### 4. z-index 必须高于所有 sticky/fixed 元素

**正确方式**：新 overlay/toolbar z-index > 最高现有 sticky/fixed 元素 z-index。topbar 通常 z-index:100，所以 toolbar z-index:110，zoom modal z-index:200。
**禁止方式**：低于已有 sticky/fixed 元素的 z-index。

## drawio转换

**最终交付物是drawio文件**，不是Mermaid渲染的HTML页面：

1. **中间态**：HTML中的Mermaid代码是AI生成的预览态，3图 tab 切换 + classDef 配色
2. **转换流程**：Mermaid → Python脚本生成drawio XML → draw.io桌面端手动微调 → PNG/SVG导出
3. **drawio风格**：TAPD 风格 — 简洁纵向、节点对齐、浅色系

## 生成检查清单

生成HTML后，对照以下清单检查：

- [ ] 每个 `<section>` 有 `contentEditable="true"`（不是 per-element `.editable`）
- [ ] 编辑态只有 `outline:2px solid var(--accent)`（无背景变化）
- [ ] 修改过的 section 有 `border-left:3px solid accent` 指示
- [ ] 浏览器原生 Ctrl+Z 撤销可用（无自定义 undo handler）
- [ ] CSS遵循阿里云简约风格（无渐变/无厚重阴影/无紫色）
- [ ] MD中的表格完整渲染为HTML `<table>`，保留所有列和所有行
- [ ] 底部 toolbar 有 `[+行][−行][+列][−列]` 按钮和修改统计
- [ ] 表格 TD 检测用 `click + closest()`（不是 `focusin`）
- [ ] toolbar 焦点保护用 `mousedown preventDefault`
- [ ] Mermaid 3图 tab 有 classDef 配色，节点定义与连线分离
- [ ] Mermaid `startOnLoad:false`（不是 `startOnLoad:true`）
- [ ] 图表 `max-height:50vh`，双击弹窗放大
- [ ] zoom modal z-index > topbar z-index
- [ ] 底部 toolbar 有「导出变更 JSON」按钮
- [ ] Mermaid 语法通过自检脚本验证（无 → 箭头、无 `<br/>`、无 `\n` 转义）
- [ ] 风险等级使用语义化颜色(绿/黄/红badge)
- [ ] 响应式适配（移动端768px以下）