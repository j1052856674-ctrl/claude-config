# HTML可编辑交互规格 v2.0 — Word-like Section Editing

> 定义 prd-v3 生成的 HTML PRD 文件的可编辑交互行为。
> **v2.0 核心变化**：从 per-element `.editable` 改为 section-level `contentEditable`（像 Word 一样整体编辑）。
> 引用 `standards/html-style-standard.md`（编辑态视觉样式）、`standards/html-build-spec.md`（MD→HTML 构建规范）。

## 核心机制：Section-level contentEditable

**🚨 核心规则：整个章节是 Word-like 可编辑块**。

每个 `<section>` 加 `contentEditable="true"`，用户点击章节内任意位置即可编辑——标题、段落、列表、表格单元格全部可编辑，像 Word 一样自然。

### 与 v1.0 的关键区别

| v1.0（per-element） | v2.0（section-level） |
|---------------------|----------------------|
| 每个 td/p/heading 加 `.editable` class | 整个 `<section>` 加 `contentEditable="true"` |
| 每个元素需要唯一 ID | 不需要 per-element ID |
| 自定义 Ctrl+Z undo handler | **浏览器原生 Ctrl+Z** 逐字撤销 |
| 三态循环：默认→编辑(蓝背景)→保存(绿闪)→默认 | 只有 focus 态：细蓝边框，**无背景变化** |
| focusin/focusout 事件检测 | **click + closest()** 检测 |

### 编辑态视觉

```
默认态 → [用户点击章节内任意位置] → 编辑态 → [blur/切换] → 默认态
```

| 状态 | 视觉表现 | CSS |
|------|---------|-----|
| 默认态 | 无特殊样式 | `section[contenteditable]` outline:none |
| hover | 浅灰虚线边框提示可编辑 | `section[contenteditable]:hover{outline:1px dashed oklch(80% 0.02 260)}` |
| **编辑态（focus）** | **细蓝色实线边框，无背景变化** | `section[contenteditable]:focus{outline:2px solid var(--accent)}` |
| 已修改 | 左侧蓝色竖线标记 | `section.modified{border-left:3px solid var(--accent)}` |

**🚨 禁止蓝色背景**：编辑态只改变边框，不改变背景色。用户不需要看到大面积蓝色覆盖，只需要知道"这个章节正在编辑"。

### 变化追踪

- **focus 时**：`sec.dataset.original = sec.innerHTML`（记录原始内容）
- **blur 时**：对比 `sec.innerHTML !== sec.dataset.original`
- **修改标记**：`sec.classList.add('modified')`（左侧蓝色竖线）
- **toolbar 显示**：`✏️ 已修改 N 处`
- **JSON 导出**：导出所有修改 section 的 original + current 内容

### 撤销机制

**使用浏览器原生 Ctrl+Z**（contentEditable 天然支持逐字撤销）。**禁止自定义 undo handler**——自定义 handler 只能退回上次聚焦状态，不是逐字撤销，用户体验差。

Escape 取消当前编辑：恢复到 `dataset.original` 内容。

## 表格行列编辑

表格单元格文字编辑通过 contentEditable 自然实现（点击 TD 直接编辑文字）。**增删行列**通过底部 toolbar 按钮：

### 实现方式

底部 toolbar 区域包含 `[+行] [−行] [+列] [−列]` 按钮，只在点击表格单元格时显示。

**🚨 检测方式必须用 `click + closest()`，禁止用 `focusin`**：

原因：contentEditable 在 section 级别时，`focusin` 事件的目标是 section，不是 TD。浏览器把整个 section 当作一个编辑单元，`e.target.tagName` 是 `'SECTION'` 不是 `'TD'`，所以 `focusin` 检测永远不会匹配到 TD。

正确实现：
```js
document.addEventListener('click', function(e){
  var td = e.target.closest('.ds-table td');
  if(td){
    activeTd = td;
    activeTable = td.closest('.ds-table');
    tableBtns.classList.add('visible');  // 显示按钮
  } else if(!e.target.closest('.table-edit-btns') && !e.target.closest('.toolbar')){
    tableBtns.classList.remove('visible');  // 隐藏按钮
  }
});
```

**🚨 焦点保护必须用 `mousedown preventDefault`**：

点击 toolbar 按钮 → TD 失焦 → 需要阻止焦点转移。正确方式：`toolbar.addEventListener('mousedown', function(e){ e.preventDefault() })`。

禁止用 blur-delay 方案（keepToolbar flag + setTimeout），这种方案有竞态问题。

### 按钮行为

| 按钮 | 行为 | 保护规则 |
|------|------|---------|
| +行 | 在当前行下方插入空行 | 至少保留1行数据行 |
| −行 | 删除当前行 | 禁止删 header 行；至少保留1行数据行 |
| +列 | 在当前列右侧插入空列 | header 行插入 `<th>新列</th>` |
| −列 | 删除当前列 | 至少保留1列 |

## Mermaid Diagram 交互

### 3图 Tab 切换

§2.2 整体架构区域使用 3-tab diagram group：

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

**决策节点不加引号**：`D{角色校验}`（不是 `D{"角色校验"}`）
**端点节点不加引号**：`A([开始])`（不是 `A(["开始"])`）

### 双击弹窗放大

- 图表容器 `max-height:50vh`（占页面最多一半高度）
- **双击** `.mermaid-wrap` → 弹出全屏 zoom modal
- modal：`position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.7)`
- 关闭方式：点击 ✕ / Esc / 点击背景

### 🚨 Mermaid v10 display:none Bug（强制规避）

**Mermaid v10 无法在 `display:none` 容器中渲染**。Tab 切换 UI 中，非 active 的 panel 是 `display:none`。

**必须使用 `startOnLoad:false`**，然后手动只渲染 active panel：

```js
mermaid.initialize({startOnLoad:false, ...});
// 只渲染当前可见的 panel
var activePanel = document.querySelector('.diagram-panel.active');
if(activePanel){
  mermaid.run({nodes: activePanel.querySelectorAll('.mermaid:not([data-processed])')});
}
// Tab 切换时 lazy render
tab.addEventListener('click', function(){
  var panel = group.querySelector('#' + tab.dataset.panel);
  if(panel) panel.classList.add('active');
  var unrendered = panel.querySelectorAll('.mermaid:not([data-processed])');
  if(unrendered.length > 0) mermaid.run({nodes: unrendered});
});
```

**禁止 `startOnLoad:true`** 在任何有 tab 切换 UI 的 HTML 中使用。

## Bug 模式警告（🚨 4 个必避模式）

从实际迭代中提炼的 4 个反复出现的 bug 模式，每次实现 HTML 时必须检查：

### 1. contentEditable 父容器焦点检测陷阱

**现象**：需要检测用户点击了哪个 TD 来显示 toolbar 按钮，但 `focusin` 的 `e.target` 是 section（不是 TD）。

**根因**：contentEditable 在 section 级别 → 浏览器把整个 section 当作一个编辑单元 → focus/focusin 事件目标永远是 section。

**正确方式**：`click + e.target.closest('.ds-table td')`
**禁止方式**：`focusin + e.target.tagName === 'TD'`

### 2. Mermaid v10 display:none Bug

**现象**：Mermaid 图表报 "Syntax error in text"。

**根因**：Tab UI 中非 active panel 是 `display:none` → Mermaid v10 无法在 `display:none` 中渲染 → `startOnLoad:true` 尝试渲染所有 `.mermaid` → 隐藏的图报错。

**正确方式**：`startOnLoad:false` + 手动渲染 active panel + tab 切换时 lazy render
**禁止方式**：`startOnLoad:true`

### 3. mousedown preventDefault 阻止焦点转移

**现象**：点击 toolbar 按钮 → TD 失焦 → 按钮操作失败或 toolbar 消失。

**根因**：浏览器事件顺序 mousedown → blur → mouseup → click。blur 在 click 之前，导致 toolbar 消失。

**正确方式**：`toolbar.addEventListener('mousedown', function(e){ e.preventDefault() })`
**禁止方式**：`keepToolbar` flag + `setTimeout(150ms)` 焦点竞态方案

### 4. z-index 必须高于所有 sticky/fixed 元素

**现象**：浮动 overlay/toolbar 看不到，被 sticky header 遮挡。

**根因**：toolbar `z-index:50` < topbar `z-index:100` → 重叠区域 toolbar 在 topbar 后面。

**正确方式**：任何新 overlay/toolbar z-index > 最高现有 sticky/fixed 元素。topbar 通常 `z-index:100`，所以新 overlay 需要 `z-index:110` 或更高。

## JSON 导出格式

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
    },
    "s2": {
      "id": "s2",
      "original": "...",
      "current": "..."
    }
  },
  "totalModified": 2
}
```

changes 按 section ID 组织，每个修改的 section 包含完整的 original 和 current HTML。

## Claude 同步流程

1. 用户在 HTML 中编辑 section → blur 自动记录变化 → toolbar 显示"✏️ 已修改 N 处"
2. 用户点击「导出变更 JSON」→ 下载 JSON 文件
3. 用户把 JSON 粘贴给 Claude → Claude 读取 changes → 按 section ID 定位 MD 对应章节 → 更新文字内容
4. 如变更涉及 Mermaid 图表 → Claude 更新 MD 中 Mermaid 代码 + 重新生成 drawio

## 生成检查清单

- [ ] 每个 `<section>` 有 `contentEditable="true"`（不是 per-element `.editable`）
- [ ] 编辑态只有 `outline:2px solid var(--accent)`（无背景变化）
- [ ] 修改过的 section 有 `border-left:3px solid accent` 指示
- [ ] 浏览器原生 Ctrl+Z 撤销可用（无自定义 undo handler）
- [ ] 底部 toolbar 有 `[+行][−行][+列][−列]` 按钮
- [ ] 表格 TD 检测用 `click + closest()`（不是 `focusin`）
- [ ] toolbar 焦点保护用 `mousedown preventDefault`
- [ ] Mermaid 3图 tab 有 classDef 配色
- [ ] Mermaid `startOnLoad:false`（不是 `startOnLoad:true`）
- [ ] 双击图表弹窗放大功能正常
- [ ] 图表 `max-height:50vh`
- [ ] 底部 toolbar 有「导出变更 JSON」按钮和修改统计
- [ ] zoom modal z-index > topbar z-index