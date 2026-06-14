# DrawIO 架构图工具层规范

> 本规范是工具层约束，定义「如何用 DrawIO XML 语法实现 PRD 业务层规范」。
> 业务语义（分层定义、配色含义、模块职责）参见 PRD 规范 `standards/diagram-spec-v2.md`。

---

## 1. XML 结构约束

### 1.1 文件骨架

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio" version="26.0.0">
  <diagram name="Page-1">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1"
      tooltips="1" connect="1" arrows="1" fold="1" page="1"
      pageScale="1" pageWidth="2000" pageHeight="1200"
      math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- user shapes start at id="2" -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

- `id="0"` 和 `id="1"` 是必需的 root cells
- 用户 shapes 从 `id="2"` 开始
- `pageWidth/pageHeight` 根据图纸复杂度设置（架构图 ≥2000×1200）

### 1.2 容器嵌套规则

```xml
<!-- L1 应用层 swimlane 容器 -->
<mxCell id="l1" value="应用层" style="swimlane;startSize=40;..." vertex="1" parent="1">
  <mxGeometry x="30" y="30" width="1640" height="130" as="geometry" />
</mxCell>

<!-- L1 内的分组容器 -->
<mxCell id="l1_g1" value="用户界面" style="swimlane;startSize=26;..." vertex="1" parent="l1">
  <mxGeometry x="20" y="50" width="700" height="80" as="geometry" />
</mxCell>

<!-- 分组内的节点 -->
<mxCell id="n_query" value="一键查询页" style="rounded=1;..." vertex="1" parent="l1_g1">
  <mxGeometry x="20" y="15" width="140" height="50" as="geometry" />
</mxCell>
```

- 层级容器 `parent="1"`
- 分组容器 `parent=层级容器id`
- 节点 `parent=分组容器id`（相对坐标）

---

## 2. 节点 Style 约束

### 2.1 标准节点样式映射

| PRD 节点类型 | drawio style 属性 | 示例 |
|-------------|------------------|------|
| process | `rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;` | 业务功能节点 |
| database | `shape=cylinder3;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=12;` | 数据表节点 |
| external | `rounded=0;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontSize=12;` | 外部系统节点 |
| warn | `rounded=1;whiteSpace=wrap;html=1;fillColor=#ffd6d6;strokeColor=#e63946;fontSize=12;` | 异常降级节点 |
| todo | `rounded=1;dashed=1;whiteSpace=wrap;html=1;fillColor=#fff8e6;strokeColor=#f99d37;fontSize=12;` | 二期待开发 |

### 2.2 容器样式

| 容器类型 | style 属性 | 用途 |
|---------|-----------|------|
| 层级 swimlane | `swimlane;startSize=40;fillColor=[层级bg];strokeColor=[层级border];fontStyle=1;fontSize=14;html=1;` | L0-L4 层级容器 |
| 分组 swimlane | `swimlane;startSize=26;fillColor=#f5f5f5;strokeColor=#999999;fontSize=12;html=1;rounded=1;` | 同层级内的系统分组 |
| 图例框 | `rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;` | 右上角独立图例 |

---

## 3. 连线 Style 约束

### 3.1 线型样式

```
实线（主动调用）：
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;dashed=0;strokeColor=#6c8ebf;

虚线（数据回传 / 配置读取）：
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;strokeColor=#9673a6;
```

### 3.2 连线方向约束

| 方向 | exitX/exitY | entryX/entryY | 适用场景 |
|------|-------------|--------------|---------|
| 自上而下 | 0.5, 1 | 0.5, 0 | 调用（高层→低层） |
| 自下而上 | 0.5, 0 | 0.5, 1 | 回传（低层→高层） |
| 水平向右 | 1, 0.5 | 0, 0.5 | 同级横向 |
| 水平向左 | 0, 0.5 | 1, 0.5 | 同级横向 |

### 3.3 多连线分散

当节点有多个出口时，分散 exitX 值防止连线堆叠：

```xml
<!-- 3个出口分散 -->
<mxCell ... style="...exitX=0.25;exitY=1;..." />  <!-- 左下 -->
<mxCell ... style="...exitX=0.5;exitY=1;..." />   <!-- 正下 -->
<mxCell ... style="...exitX=0.75;exitY=1;..." />  <!-- 右下 -->
```

---

## 4. 像素布局约束

### 4.1 标准尺寸

| 元素 | 最小宽度 | 最小高度 | 备注 |
|------|---------|---------|------|
| 层级容器 | 1640 | 130 | 架构图3层总宽≈1700 |
| 分组容器 | 300 | 80 | 根据子节点动态调整 |
| process 节点 | 140 | 50 | 固定尺寸 |
| database 节点 | 120 | 60 | 固定尺寸 |
| 图例框 | 200 | 150 | 根据内容动态调整 |

### 4.2 间距标准

| 场景 | 最小间距 | 说明 |
|------|---------|------|
| 层级容器之间 | ≥80px | 预留路由走廊 |
| 同级分组之间 | ≥40px | 分组间留白 |
| 同分组内节点 | ≥20px | 节点间间距 |
| 跨分组节点 | ≥200px（水平）/ ≥150px（垂直） | 避免拥挤 |

### 4.3 对齐规则

- 所有坐标对齐到 **10 的倍数**
- 同层级节点 y 坐标相同（水平排列）
- 同分组内节点中心对齐到父容器中心线

---

## 5. 图例 XML 示例

```xml
<!-- 图例框（右上角，parent="1"） -->
<mxCell id="legend" value="&lt;b&gt;图例&lt;/b&gt;&lt;br&gt;
实线 = 主动调用&lt;br&gt;
虚线 = 数据回传"
  style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;"
  vertex="1" parent="1">
  <mxGeometry x="1720" y="30" width="200" height="150" as="geometry" />
</mxCell>
```

---

## 6. 禁止事项（工具层）

- 节点 parent 指向错误的容器
- 连线缺少 `<mxGeometry relative="1" as="geometry" />` 子元素
- 节点坐标不对齐到 10 的倍数
- 连线使用斜线（必须使用 `orthogonalEdgeStyle`）
- 节点尺寸小于标准尺寸
- 容器嵌套超过 2 层（层级→分组→节点）
