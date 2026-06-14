# PRD 流程图标准规范 v2.0

> 基于 TAPD 团队实际使用模式和 DataAgent 历史架构图风格制定。
> 所有 PRD 中的流程图、架构图必须遵循此规范。

> 🚨 **重要声明：Mermaid 是中间态，drawio 是最终交付物**
> - HTML中的Mermaid渲染是AI生成的预览态，方便快速查看逻辑流程
> - 最终交付物为 drawio XML 文件，可在 draw.io 桌面端手动微调
> - 参考风格：TAPD 风格流程图（简洁、纵向、节点对齐）
> - 转换流程：Mermaid → Python脚本(`scripts/gen_drawio.py`)生成drawio XML → draw.io手动微调 → PNG/SVG导出

---

## 一、HTML 流程图规范

### 1.1 可编辑性要求

**所有 HTML 流程图必须支持元素级编辑：**

| 元素类型 | 可编辑内容 | 编辑方式 | 数据回传 |
|---------|-----------|---------|---------|
| 节点文本 | 节点名称、描述 | 双击编辑 | 自动同步到 data-* 属性 |
| 节点样式 | 颜色、边框、形状 | 右键菜单 | 实时更新 class/style |
| 连线标签 | 流转条件文字 | 双击编辑 | 更新 edge label |
| 节点位置 | x/y 坐标 | 拖拽 | 自动保存到 dataset |
| 节点删除 | 删除节点+连线 | Delete键 | 触发 delete 事件 |
| 节点新增 | 添加新节点 | 工具栏按钮 | 自动分配 ID |

**回传 AI 的数据格式：**

```javascript
// 编辑后自动收集变更
const changes = {
  type: 'node_edit|style_change|position_move|edge_label|node_delete|node_add',
  targetId: 'node_001',
  oldValue: '旧文本',
  newValue: '新文本',
  timestamp: '2026-06-03T10:00:00Z',
  user: 'current_user'
};
// 通过 postMessage 或 API 回传给 AI
window.parent.postMessage({ type: 'flowchart_change', data: changes }, '*');
```

### 1.2 HTML 结构规范

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>流程图标题</title>
  <!-- Mermaid 10.x -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    /* 必须包含的基础样式 */
    :root {
      /* 颜色系统 - 从历史HTML提取 */
      --cognitive-fill: #ede9fe;      --cognitive-stroke: #8b5cf6;
      --execution-fill: #dbeafe;      --execution-stroke: #3b82f6;
      --reasoning-fill: #ffedd5;      --reasoning-stroke: #f97316;
      --delivery-fill: #d1fae5;       --delivery-stroke: #10b981;
      --storage-fill: #f8fafc;        --storage-stroke: #64748b;
      --checkpoint-fill: #fecaca;     --checkpoint-stroke: #dc2626;
      --user-fill: #ecfeff;           --user-stroke: #06b6d4;
      --text-primary: #1e293b;      --text-secondary: #64748b;
      --border-default: #e2e8f0;    --bg-page: #f8fafc;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      padding: 40px;
    }
    h1 { text-align: center; color: #1e293b; margin-bottom: 8px; font-size: 28px; font-weight: 700; }
    .subtitle { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 30px; }
    .mermaid {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      border: 1px solid #e2e8f0;
    }
    /* Zoom 控制 */
    .zoom-controls {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 8px;
      z-index: 1000;
    }
    .zoom-btn {
      width: 40px; height: 40px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: white;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }
    .zoom-btn:hover { background: #f8fafc; transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="container">
    <h1>流程图标题</h1>
    <div class="subtitle">副标题</div>
    <div class="mermaid">
      <!-- Mermaid 代码 -->
    </div>
  </div>
  <div class="zoom-controls">
    <button class="zoom-btn" onclick="zoomIn()" title="放大">+</button>
    <button class="zoom-btn" onclick="zoomReset()" title="重置">⟲</button>
    <button class="zoom-btn" onclick="zoomOut()" title="缩小">−</button>
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        primaryColor: '#f8fafc',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#64748b',
        lineColor: '#64748b',
        secondaryColor: '#f1f5f9',
        tertiaryColor: '#fff'
      },
      flowchart: { curve: 'basis', padding: 25 }
    });
    // Zoom 控制
    let scale = 1;
    function zoomIn() { scale *= 1.2; document.querySelector('.mermaid').style.transform = `scale(${scale})`; }
    function zoomOut() { scale /= 1.2; document.querySelector('.mermaid').style.transform = `scale(${scale})`; }
    function zoomReset() { scale = 1; document.querySelector('.mermaid').style.transform = `scale(1)`; }
  </script>
</body>
</html>
```

---

## 二、PRD 美观规范

### 2.1 颜色系统（从 DataAgent 历史风格提取）

| 层级/类型 | 填充色 (fillColor) | 边框色 (strokeColor) | 文字色 | 用途 |
|---------|-------------------|---------------------|--------|------|
| **认知层** | `#ede9fe` | `#8b5cf6` | `#5b21b6` | 语义解析、意图识别 |
| **执行层** | `#dbeafe` | `#3b82f6` | `#1e40af` | SQL生成、代码执行 |
| **推理层** | `#ffedd5` | `#f97316` | `#9a3412` | 归因分析、诊断决策 |
| **交付层** | `#d1fae5` | `#10b981` | `#166534` | 报告输出、可视化 |
| **存储层** | `#f8fafc` | `#64748b` | `#475569` | 数据库、缓存、知识库 |
| **中断点** | `#fecaca` | `#dc2626` | `#991b1b` | 人机交互检查点 |
| **用户入口** | `#ecfeff` | `#06b6d4` | `#0e7490` | 用户交互节点 |
| **通用步骤** | `#dae8fc` | `#6c8ebf` | `#1e293b` | 通用业务步骤 |
| **结束节点** | `#f8cecc` | `#b85450` | `#7f1d1d` | 流程终止 |
| **判断节点** | `#fff2cc` | `#d6b656` | `#92400e` | 菱形判断 |

### 2.2 字体与排版

| 元素 | 字体 | 字号 | 字重 | 其他 |
|-----|------|------|------|------|
| 节点标题 | system-ui, sans-serif | 13px | 600 | 单行显示 |
| 节点描述 | system-ui, sans-serif | 11px | 400 | 最多2行 |
| 连线标签 | system-ui, sans-serif | 11px | 500 | 条件文字 |
| 图例标题 | system-ui, sans-serif | 13px | 600 | uppercase, letter-spacing: 0.5px |
| 图例说明 | system-ui, sans-serif | 12px | 400 | — |
| 页面标题 | system-ui, sans-serif | 28px | 700 | 居中 |
| 副标题 | system-ui, sans-serif | 14px | 400 | 居中, #64748b |

### 2.3 间距规范

| 场景 | 水平间距 | 垂直间距 |
|-----|---------|---------|
| 简单 (≤5节点) | 200px | 150px |
| 中等 (6-10节点) | 280px | 200px |
| 复杂 (>10节点) | 350px | 250px |
| 连线走廊 | 额外 80px | 额外 80px |
| 容器内边距 | 20px | 20px |

**对齐规则：** 所有 `x`, `y`, `width`, `height` 值必须是 **10的倍数**。

---

## 三、Draw.io 连线规范（🚨 重点）

### 3.1 连线基本要求

| 要求项 | 规范 | 禁止 |
|-------|------|------|
| **连线类型** | 正交路由 (orthogonalEdgeStyle) | 斜线、曲线（basis 除外） |
| **圆角** | rounded=1 | 直角硬折 |
| **loop 样式** | orthogonalLoop=1 | 无 loop 控制 |
| **jetty** | jettySize=auto | 固定 jetty |
| **HTML渲染** | html=1 | 纯文本 |
| **字体** | fontSize=11 | 默认字体大小 |

### 3.2 连线起点/终点对齐规范（🚨 最关键）

**必须满足：连线的起点和终点必须对齐元素的端点或正中间。**

| 连接方向 | exitX | exitY | entryX | entryY | 说明 |
|---------|-------|-------|--------|--------|------|
| 从上到下 | 0.5 | 1 | 0.5 | 0 | 垂直向下，正中-正中 |
| 从下到上 | 0.5 | 0 | 0.5 | 1 | 垂直向上，正中-正中 |
| 从左到右 | 1 | 0.5 | 0 | 0.5 | 水平向右，正中-正中 |
| 从右到左 | 0 | 0.5 | 1 | 0.5 | 水平向左，正中-正中 |
| 左上→右下 | 1 | 0.5 | 0.5 | 0 | 出右中，入上中 |
| 左下→右上 | 1 | 0.5 | 0.5 | 1 | 出右中，入下中 |
| 右上→左下 | 0 | 0.5 | 0.5 | 0 | 出左中，入上中 |
| 右下→左上 | 0 | 0.5 | 0.5 | 1 | 出左中，入下中 |

**多连接分布（当一个元素有多个连线时）：**

```
单个元素有 N 个出口时的分布规则：

出口在下方（exitX 分布）:
  N=2: exitX = 0.33, 0.67
  N=3: exitX = 0.25, 0.5, 0.75
  N=4: exitX = 0.2, 0.4, 0.6, 0.8

出口在右方（exitY 分布）:
  N=2: exitY = 0.33, 0.67
  N=3: exitY = 0.25, 0.5, 0.75
```

**连线风格模板：**

```xml
<!-- 标准有向箭头（无标签） -->
<mxCell id="edge1" value="" 
  style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;" 
  edge="1" parent="1" source="A" target="B">
  <mxGeometry relative="1" as="geometry" />
</mxCell>

<!-- 带标签的连线 -->
<mxCell id="edge2" value="通过" 
  style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;fontSize=11;" 
  edge="1" parent="1" source="A" target="B">
  <mxGeometry relative="1" as="geometry" />
</mxCell>

<!-- 带明确出口/入口点的连线 -->
<mxCell id="edge3" value="" 
  style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" 
  edge="1" parent="1" source="A" target="B">
  <mxGeometry relative="1" as="geometry" />
</mxCell>

<!-- 虚线连线 -->
<mxCell id="edge4" value="" 
  style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;fontSize=11;" 
  edge="1" parent="1" source="A" target="B">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

### 3.3 禁止的连线问题

| 问题类型 | 示例 | 修复方法 |
|---------|------|---------|
| ❌ 连线穿越形状 | 箭头穿过不相关的节点 | 添加 waypoints 或使用 routing corridors |
| ❌ 连线起点不在端点 | 从节点中间位置出发 | 设置 exitX/exitY 为 0, 0.5, 或 1 |
| ❌ 连线终点不对齐 | 箭头指向节点边缘而非端点 | 设置 entryX/entryY 为 0, 0.5, 或 1 |
| ❌ 连线重叠 | 多条连线在同一位置重叠 | 分散 exitX/entryX |
| ❌ 斜线连接 | 节点间直接斜线 | 使用正交路由 (orthogonalEdgeStyle) |
| ❌ 连线过长无节点 | 跨越整个图的连线 | 增加中间节点或调整布局 |

### 3.4 路由走廊规范

```
布局时预留的空白区域（routing corridors）：

┌─────────────────────────────────────────┐
│                                         │
│   [节点A]                               │
│      │                                  │
│      │ ← 垂直走廊 (≥80px)               │
│      │                                  │
│   [节点B] ──────────→ [节点C]           │
│            水平走廊 (≥80px)             │
│                                         │
└─────────────────────────────────────────┘
```

---

## 四、流程图质量自检清单

| # | 检查项 | 标准 | 判定 |
|---|-------|------|------|
| 1 | 连线类型 | 使用 orthogonalEdgeStyle 正交路由 | ✅/❌ |
| 2 | 连线圆角 | rounded=1, orthogonalLoop=1 | ✅/❌ |
| 3 | 出口对齐 | exitX/exitY ∈ {0, 0.5, 1} | ✅/❌ |
| 4 | 入口对齐 | entryX/entryY ∈ {0, 0.5, 1} | ✅/❌ |
| 5 | 连线不穿越形状 | 所有连线避开无关节点 | ✅/❌ |
| 6 | 多连接分布 | 同一侧出口均匀分布 | ✅/❌ |
| 7 | 颜色一致性 | 同层级使用相同配色 | ✅/❌ |
| 8 | 字体统一 | 全部使用 system-ui, sans-serif | ✅/❌ |
| 9 | 间距对齐 | 所有坐标为10的倍数 | ✅/❌ |
| 10 | 完整链路 | 从起点到终点无断链 | ✅/❌ |
| 11 | 异常分支 | 至少包含1个异常/失败分支 | ✅/❌ |
| 12 | 节点命名 | 使用业务语言，非抽象编号 | ✅/❌ |

---

## 五、典型错误示例与修正

### 错误1：连线起点不在端点
```xml
<!-- ❌ 错误：exitX=0.3, 不在端点 -->
<mxCell ... style="...exitX=0.3;exitY=1;..." />

<!-- ✅ 正确：exitX=0.5, 正中 -->
<mxCell ... style="...exitX=0.5;exitY=1;..." />
```

### 错误2：连线穿越形状
```xml
<!-- ❌ 错误：从A到C的连线穿过B -->
<!-- ✅ 正确：添加 waypoint 绕开B -->
<mxCell ...>
  <mxGeometry relative="1" as="geometry">
    <Array as="points">
      <mxPoint x="500" y="200" />
    </Array>
  </mxGeometry>
</mxCell>
```

### 错误3：多连接重叠
```xml
<!-- ❌ 错误：两个出口都从底部正中出发，连线重叠 -->
<mxCell ... style="...exitX=0.5;exitY=1..." />  <!-- 出口1 -->
<mxCell ... style="...exitX=0.5;exitY=1..." />  <!-- 出口2 -->

<!-- ✅ 正确：分散出口位置 -->
<mxCell ... style="...exitX=0.25;exitY=1..." />  <!-- 出口1 -->
<mxCell ... style="...exitX=0.75;exitY=1..." />  <!-- 出口2 -->
```

---

## 六、工具命令速查

```bash
# 导出预览 PNG（Step 4，不带 -e）
drawio -x -f png --width 2000 -o output.png input.drawio

# 导出最终 PNG（Step 7，带 -e）
drawio -x -f png -e -s 2 -o output.drawio.png input.drawio

# 修复 -e PNG 的 IEND 截断问题
python ~/.claude/skills/drawio-skill/scripts/repair_png.py output.drawio.png

# 验证 drawio 文件结构
python ~/.claude/skills/drawio-skill/scripts/validate.py input.drawio

# 搜索官方形状
python ~/.claude/skills/drawio-skill/scripts/shapesearch.py "flowchart decision" --limit 5
```

---

*规范版本：v2.0 | 更新日期：2026/06/03 | 参考历史文件：DataAgent_Architecture.html*
