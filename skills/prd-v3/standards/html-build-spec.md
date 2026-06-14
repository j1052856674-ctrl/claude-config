# MD→HTML 构建规范 v2.0

> 定义 prd-v3 MD 文件到 Word-like 可编辑 HTML 的构建管道规范。
> 所有 prd-v3 的 HTML 生成脚本必须遵循此规范。
> 引用 `standards/html-style-standard.md`（风格规范）、`standards/html-editable-spec.md`（可编辑交互规格）。

## 构建管道概览

```
MD 文件 ──[解析]──→ HTML 片段 ──[section 拆分]──→ 骨架注入 ──→ 单文件 HTML
```

输入：`[项目名]-PRD.md`
输出：`[项目名]-PRD.html`（自包含单文件，contentEditable sections）

## Step 1: MD 解析

### 元数据提取

跳过第一个 `## ` 之前的内容（`#` 标题行除外），提取 `>` 开头的元信息行。

```
# 项目名 — PRD          ← 提取标题
> **版本**: v1.0         ← 提取为 doc-header blockquote
> **日期**: 2026-06-08
## 1. 需求背景与目标      ← 正文开始
```

### 支持的元素与转换规则

| MD 元素 | HTML 输出 | 说明 |
|---------|----------|------|
| `## N. 章节名` | `<h2 id="sN">` | id 从章节编号提取（如 §1 → id=s1，§A → id=sa） |
| `### N.M 小节名` | `<h3 id="sN-M">` | id 格式 s`编号`（如 §2.2 → id=s2-2） |
| `#### 标题` | `<h4>` | 四级标题无 id |
| `**粗体**` / `*斜体*` | `<strong>` / `<em>` | inline 格式化 |
| `[文本](url)` | `<a href="url">文本</a>` | 链接 |
| `-` 或 `*` 无序列表 | `<ul><li>` | 连续 `- ` 行合并为单个 ul |
| `1.` 有序列表 | `<ol><li>` | 连续数字列表行合并为单个 ol |
| 表格 `|...|` | `<table class="ds-table">` | 按分隔行（`|---|`）识别 header/body |
| ` ``` ` 代码块 | `<pre class="code-block">` | YAML 代码块加 `contenteditable="true"` |
| ` ```mermaid ` | `<div class="mermaid">...</div>` | 特殊处理见 Step 2 |
| `>` 引用 | `<blockquote>` | 连续 `>` 行合并 |
| `---` | `<hr>` | 水平分割线 |
| 普通文本 | `<p>` | 连续非特殊行合并为单个 p |

### 表格转换规则

```python
def convert_table(table_lines):
    # 1. 按 | 分割每行单元格
    # 2. 找到分隔行（|---|...|）确定 header/body 分界
    # 3. 第一行 → <th>（header），其余 → <td>
    # 4. 每个单元格内容经过 format_inline() 处理（粗体、链接等）
    # 5. table class="ds-table"
```

### inline 格式化规则

```python
def format_inline(text):
    # 顺序：先处理链接 [text](url)，再处理粗体 **text**，最后斜体 *text*
    # HTML 转义：& → &amp;  < → &lt;  > → &gt;（在格式化之后执行）
```

## Step 2: Mermaid 图表特殊处理

### §2.2 架构图 → 3图 Tab Group

§2.2 下的架构图 Mermaid 代码块替换为 3-tab diagram group：

```html
<div class="diagram-group">
  <div class="diagram-tabs">
    <div class="diagram-tab active" data-panel="panel-arch">架构图</div>
    <div class="diagram-tab" data-panel="panel-flow">流程图</div>
    <div class="diagram-tab" data-panel="panel-swim">泳道图</div>
  </div>
  <div class="diagram-panel active" id="panel-arch">
    <div class="mermaid-wrap" style="max-height:50vh;overflow:auto">
      <div class="mermaid">[架构图 Mermaid 代码]</div>
    </div>
  </div>
  <div class="diagram-panel" id="panel-flow">...</div>
  <div class="diagram-panel" id="panel-swim">...</div>
</div>
```

**识别条件**：§2.2 下的 mermaid 代码块，或含 `subgraph app` 之类架构图层级标记。

### §2.3 流程图 → Tab 中展示

§2.3 的流程图 Mermaid 代码块在 tab group 的"流程图"tab 中展示，MD 中该位置替换为简要说明文字。

### 其他 Mermaid 代码块

独立 mermaid 代码块：包裹在 `.mermaid-wrap` 中，标注 "Mermaid 预览 · 双击可放大"。

### Mermaid classDef 配色方案（强制）

所有 3 图必须使用以下 classDef 配色：

| 图 | classDef | 色值 |
|----|----------|------|
| 架构图 | appLayer / midLayer / configLayer / dataLayer | #d1fae5/#10b981 / #ffedd5/#f97316 / #fefce8/#eab308 / #ede9fe/#8b5cf6 |
| 流程图 | process / decision / endpoint / error | #dbeafe/#3b82f6 / #fef3c7/#f59e0b / #d1fae5/#10b981 / #fecaca/#dc2626 |
| 泳道图 | userStep / aiStep / dataStep / configStep / decision | #ecfeff/#06b6d4 / #dbeafe/#3b82f6 / #ede9fe/#8b5cf6 / #fefce8/#eab308 / #fef3c7/#f59e0b |

### classDef 语法规则（🚨 强制）

```
✅ 正确：节点定义行使用 :::classDef
A([开始]):::endpoint
B["选择角色"]:::process
A --> B --> C

❌ 错误：连接行上使用 :::classDef
A([开始]):::endpoint --> B["选择角色"]:::process
```

- 决策节点不加引号：`D{角色校验}`（不是 `D{"角色校验"}`）
- 端点节点不加引号：`A([开始])`（不是 `A(["开始"])`）
- 实线调用（`-->`），虚线返回/回传（`-.->`）

## Step 3: Section 拆分

解析后的 HTML 按 `## ` 标题拆分为独立的 `<section contenteditable="true">`：

```python
# 输入：连续的 HTML 片段
# 1. 找到所有 <h2 id="..."> 标题
# 2. 每对 h2 之间的内容归入一个 section
# 3. doc-header（元信息）放在 sections 最前面
# 4. 每个 section 的 id = h2 的 id（如 s1, s2, s3-2）
```

Section 结构：
```html
<section id="s1" contenteditable="true">
  <h2 id="s1">1. 需求背景与目标</h2>
  <!-- 标题下的所有内容：段落、列表、表格等 -->
</section>
```

## Step 4: Sidebar 生成

从 MD 提取 `## ` 和 `### ` 标题，生成侧边栏导航：

```python
def generate_sidebar(md_text):
    # ## → nav-l1（一级导航，不可点击标签）
    # ### → nav-l2（二级导航，可点击，指向对应 section 的 id）
    # 无编号标题也保留（如"附录"）
```

## Step 5: 骨架注入

将 title、sidebar、content 注入 HTML 骨架模板。

### 骨架模板必须包含

| 组件 | CSS class/id | 说明 |
|------|-------------|------|
| Topbar | `.topbar` | `position:sticky;top:0;z-index:100` |
| Sidebar | `#sidebar` | `position:fixed;left:0`，nav-l1 + nav-l2 |
| Content | `#content` | `margin-left` 为 sidebar 留空间 |
| Section | `section[contenteditable]` | 每个章节一个 section |
| Toolbar | `.toolbar` | `position:sticky;bottom:0;z-index:110` |
| Table edit btns | `#tableEditBtns` | 默认 `display:none`，点击 TD 时 `.visible` |
| Zoom modal | `#zoomModal` | `position:fixed;z-index:200` |
| Diagram tabs | `.diagram-group` | 3-tab 切换组 |
| Section modified | `section.modified` | `border-left:3px solid accent` |

### 骨架模板 JS 必须实现

| 功能 | 实现方式 | 关键约束 |
|------|---------|---------|
| 变化追踪 | section focus 记录 original，blur 对比 | 用 `dataset.original` |
| 修改统计 | `updateStats()` 更新 toolbar 计数 | toolbar 显示 "✏️ 已修改 N 处" |
| JSON 导出 | 收集 edits 对象，生成 Blob 下载 | 按 section id 组织 |
| 预览/编辑切换 | toggle contentEditable | "切换预览模式" / "切换编辑模式" |
| 表格行列编辑 | click + closest TD 检测 | mousedown preventDefault 保护焦点 |
| Mermaid 渲染 | startOnLoad:false + manual active panel render | lazy render on tab switch |
| Diagram tab 切换 | 切换 `.active` class + lazy mermaid.run | 非 active panel display:none |
| 缩放弹窗 | 双击 `.mermaid-wrap` → zoom modal | z-index:200 > topbar |
| Scroll spy | scroll 事件 + 高亮当前 sidebar 链接 | |
| Escape 关闭 | keydown Escape → 关闭 zoom modal | |

### 禁止事项

- 禁止 `startOnLoad:true`（Mermaid v10 display:none bug）
- 禁止 `focusin` 检测 TD（contentEditable 下目标是 section）
- 禁止自定义 Ctrl+Z undo handler（用浏览器原生）
- 禁止 `keepToolbar` + setTimeout 焦点方案（用 mousedown preventDefault）
- 禁止 per-element `.editable` class（用 section-level contentEditable）

## 构建脚本模板

构建脚本应采用以下结构：

```python
#!/usr/bin/env python3
"""Build: MD → single editable HTML (Word-like editing)"""

import os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MD_FILE = os.path.join(BASE_DIR, '..', '[项目名]-PRD.md')
OUTPUT = os.path.join(BASE_DIR, '..', '[项目名]-PRD.html')

# ── Mermaid diagrams (3图 classDef 配色) ──
ARCH_DIAGRAM = '''...'''   # 架构图
FLOW_DIAGRAM = '''...'''   # 流程图
SWIM_DIAGRAM = '''...'''   # 泳道图

# ── MD → HTML converter ──
def escape_html(text): ...
def format_inline(text): ...
def convert_table(table_lines): ...
def convert_md(md_text): ...
def generate_sidebar(md_text): ...

# ── Skeleton template ──
SKELETON = '''<!doctype html>...'''

# ── Main ──
def main():
    # 1. 读取 MD
    # 2. 提取标题和元信息
    # 3. convert_md() → HTML 片段
    # 4. 按 h2 拆分 section
    # 5. 注入 SKELETON
    # 6. 写入输出文件

if __name__ == '__main__':
    main()
```

### 参数化要点

构建脚本中以下内容随项目变化：

| 变量 | 说明 | 示例 |
|------|------|------|
| `MD_FILE` | 输入 MD 路径 | `'..' / '[项目名]-PRD.md'` |
| `OUTPUT` | 输出 HTML 路径 | `'..' / '[项目名]-PRD.html'` |
| `ARCH_DIAGRAM` | 架构图 Mermaid 代码 | 项目专属架构层次 |
| `FLOW_DIAGRAM` | 流程图 Mermaid 代码 | 项目专属流程节点 |
| `SWIM_DIAGRAM` | 泳道图 Mermaid 代码 | 项目专属跨系统交互 |
| SKELETON 中 `<title>` | HTML 标题 | 项目名 |
| SKELETON 中 topbar 标题 | 页面标题 | 项目名 PRD v1.0 |

## 输出物特征

生成的 HTML 必须满足：

- **自包含**：CSS 和 JS 全部内联，Mermaid 从 CDN 加载（带 onerror 回退）
- **单文件**：不依赖外部 CSS/JS 文件（Mermaid CDN 除外）
- **contentEditable**：所有 section 可直接编辑
- **支持暗色模式**：`@media (prefers-color-scheme: dark)`
- **支持打印**：`@media print`（隐藏 sidebar/topbar/toolbar）
- **响应式**：920px 以下隐藏 sidebar，内容区全宽

## 验证清单

构建完成后检查：

- [ ] HTML 可正常打开，Mermaid 图表渲染成功
- [ ] 3图 tab 切换正常，classDef 配色正确
- [ ] 点击 section 可编辑，编辑态只有蓝边框无蓝背景
- [ ] 浏览器 Ctrl+Z 撤销可用
- [ ] 点击表格 TD → 底部 toolbar 显示行列按钮
- [ ] 双击 Mermaid 图表 → zoom modal 正常弹窗
- [ ] "导出变更 JSON" 按钮下载的 JSON 格式正确
- [ ] 暗色模式切换正常
- [ ] 打印样式正常（无侧边栏和 toolbar）