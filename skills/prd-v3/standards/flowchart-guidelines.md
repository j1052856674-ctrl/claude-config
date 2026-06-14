# 流程图自动生成准则（drawio / diagrams.net）

> 基于人工调整最佳实践提炼，确保 AI 生成的流程图可直接使用，无需二次手调。

---

## 一、布局原则（Layout First）

### 1.1 先布局，后连线

**错误**：节点随意摆放，靠连线「绕」过去。  
**正确**：先确定每个节点的位置，让连线自然直走。

```
❌ 节点密集 → 线被迫弯曲绕过 → 交叉混乱
✅ 节点间距 ≥ 150px → 线直走 → 清晰美观
```

### 1.2 节点间距标准（🚨 强制最低值，低于此值连线必然穿节点）

| 方向 | 最小间距 | 推荐间距 | 说明 |
|---|---|---|---|
| 水平相邻 | **200px** | 250-350px | 给文字标签和连线走廊留足够空间，低于200px连线极易穿节点 |
| 垂直相邻 | **150px** | 180-250px | 分支多时加大至250px |
| 分组间距 | **300px** | 350-400px | 不同泳道/分组之间必须有足够走廊（80px+分组边界） |

### 1.3 对齐规则

- **同一层级的节点，y 坐标相同**（水平对齐）
- **同一分支的节点，x 坐标单调递增**（从左到右流动）
- **决策节点（菱形）的分支，水平展开**，不要垂直堆叠

```
❌          ✅
  ┌─A       A ─┬─ B
  │            │
  ├─B          ├─ C
  │            │
  └─C          └─ D
```

---

### 1.4 先放大，后收缩（核心原则）

**生成流程图时，先把所有间距放大，确保不交叉、不重叠。后续如果画布太大，再手动收缩。**

| 阶段 | 策略 | 数值 |
|---|---|---|
| **初版生成** | 距离放大 | 水平间距 ≥ **200px**，垂直间距 ≥ **150px** |
| **检查阶段** | 确认无交叉 | 所有连线直走，无弯曲、无穿越 |
| **收缩阶段** | 手动微调 | 在 draw.io 中拖拽调整，逐步收紧 |

**为什么先放大？**

```
❌ 错误：一开始间距就很小
   [A]──[B]──[C]──[D]
    ↓    ↓    ↓
   [E]  [F]  [G]
   → 连线被迫弯曲、交叉、穿越节点

✅ 正确：先放大间距
   [A]      [B]      [C]      [D]
    ↓        ↓        ↓
   [E]      [F]      [G]
   → 连线直走，无交叉
   → 后续在 draw.io 中手动收缩到合适大小
```

**AI 生成时的默认值（放大版）：**

```python
# 生成时使用的间距（放大版）
HORIZONTAL_GAP = 200   # 水平间距 200px（正常 150px）
VERTICAL_GAP = 150     # 垂直间距 150px（正常 100px）
GROUP_GAP = 300        # 分组间距 300px（正常 200px）
```

**收缩策略：**
- 在 draw.io 中打开生成的文件
- 选中整个区域，整体向左/向上移动
- 或选中单个节点，微调位置
- 不要修改 XML 中的坐标，直接在画布上拖拽

---

## 二、节点设计（Node Design）

### 2.1 节点尺寸

| 类型 | 宽度 | 高度 | 说明 |
|---|---|---|---|
| 开始/结束（圆角矩形） | 120px | 50px | 圆角半径 10px |
| 处理步骤（矩形） | 130px | 50px | 标准大小 |
| 决策（菱形） | 140px | 70px | 宽高比约 2:1 |
| 标注文字（text） | 自适应 | 25px | 无边框，纯文字 |

### 2.2 颜色规范

```
开始/结束:    fillColor=#d5e8d4; strokeColor=#82b366    (绿色)
处理步骤:    fillColor=#dae8fc; strokeColor=#6c8ebf    (蓝色)
决策节点:    fillColor=#fff2cc; strokeColor=#d6b656    (黄色)
拒绝/结束:   fillColor=#f8cecc; strokeColor=#b85450    (红色)
背景分组:    fillColor=#fff9e6/e6f3ff/ffe6f0          (浅色)
标注文字:    fillColor=none; strokeColor=none           (无填充)
```

### 2.3 字体

- 处理步骤：`fontSize=12`
- 决策节点：`fontSize=11`（菱形空间小）
- 标注标题：`fontSize=13; fontStyle=1`（加粗）

---

## 三、连线设计（Edge Design）

### 3.1 连线样式

```xml
style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;
       jettySize=auto;html=1;fontSize=11;"
```

- `edgeStyle=orthogonalEdgeStyle`：正交连线（直角折线）
- `rounded=1`：拐角处圆角
- `jettySize=auto`：自动计算偏移

### 3.2 出口方向分配（关键！）

一个节点有多个出口时，**从不同边出**，不要挤在同一侧：

| 出口数 | 方向分配 | 示例 |
|---|---|---|
| 2个 | 左 + 右 | 通过 ← ┬─ → 拒绝 |
| 3个 | 左 + 下 + 右 | 通过 ← ┬─ → 拒绝；限额 ↓ |
| 4个 | 左 + 下偏左 + 下偏右 + 右 | 通过 ← ┬┬ → 拒绝；限额 ↓ |

**核心原则**：出口方向尽量分散，避免从同一侧密集出线。

### 3.3 精确控制连线端点

使用 `sourcePoint`/`targetPoint` 或 `exitX/Y` + `entryX/Y`：

```xml
<!-- 方式1：相对位置（推荐） -->
exitX=0; exitY=0.5      <!-- 左边缘中点 -->
exitX=1; exitY=0.5       <!-- 右边缘中点 -->
exitX=0.5; exitY=1       <!-- 下边缘中点 -->
entryX=0.5; entryY=0      <!-- 上边缘中点 -->

<!-- 方式2：绝对位置（精确控制） -->
<mxPoint x="660" y="145" as="sourcePoint" />
<mxPoint x="1123.18" y="205.91" as="targetPoint" />
```

**使用场景**：
- 相对位置（exitX/Y）：一般场景，简单直观
- 绝对位置（sourcePoint/targetPoint）：需要精确控制线端点位置时

### 3.4 虚线（条件分支/备注）

```xml
style="...;dashed=1;fontSize=11;"
```

- 虚线用于：条件判断、时间判断、备注说明
- 实线用于：主流程

---

## 四、文字标签（Label Design）

### 4.1 连线文字用 edgeLabel（关键！）

**错误**：把文字写在连线的 `value` 中
```xml
<!-- ❌ 错误 -->
<mxCell ... value="通过" ... />
```

**正确**：用独立的 `edgeLabel` 子元素
```xml
<!-- ✅ 正确 -->
<mxCell id="edge-1" ... value="" ...>
  <mxGeometry ... />
</mxCell>
<mxCell id="label-1" connectable="0" parent="edge-1"
        style="edgeLabel;html=1;align=center;verticalAlign=middle;"
        value="通过" vertex="1">
  <mxGeometry relative="1" x="0.8874" y="1" as="geometry">
    <mxPoint as="offset" />
  </mxGeometry>
</mxCell>
```

### 4.2 edgeLabel 参数

```xml
<mxGeometry relative="1" x="0.5" y="-2" as="geometry">
  <mxPoint as="offset" />
</mxGeometry>
```

| 参数 | 含义 | 常用值 |
|---|---|---|
| `relative="1"` | 相对定位 | 必须 |
| `x` | 在线上的位置（0~1） | 0.5（中间）、0.8（偏终点） |
| `y` | 垂直偏移（正下负上） | 1（向下偏移）、-2（向上偏移） |

### 4.3 文字内容规范

- 简短：**"通过"、"拒绝"、"限额"**
- 避免长句：超过 10 字考虑缩写或分两行
- 编号分支：**"1、风险拒绝"、"2、标准客户"** —— 清晰对应

---

## 五、分组与背景（Grouping）

### 5.1 背景色块

```xml
<mxCell id="bg1" ... style="rounded=1;fillColor=#fff9e6;strokeColor=none;" ... />
```

| 用途 | 颜色 | ID 命名 |
|---|---|---|
| 第一组（左） | `#fff9e6`（暖黄） | `bg1` |
| 第二组（中） | `#ffe6f0`（粉红） | `bg2` |
| 第三组（右） | `#e6f3ff`（淡蓝） | `bg3` |

### 5.2 分组原则

- 同一业务模块的节点放在同一色块内
- 色块要比内容大一圈（padding 20-40px）
- 色块之间要留有间隙（50px+）

---

## 六、防交叉策略（Anti-Crossing）

### 6.1 分层布局

```
Layer 1: 开始节点
Layer 2: 决策节点（水平展开）
Layer 3: 分支处理（根据决策结果）
Layer 4: 汇合节点
Layer 5: 结束节点
```

### 6.2 分支展开规则

**决策节点有多个出口时**：

```
           ┌─→ 分支1（左）
           │
决策节点 ──┼─→ 分支2（下偏左）
           │
           ├─→ 分支3（下偏右）
           │
           └─→ 分支4（右）
```

- 优先级高的分支放左边
- 主流程分支放中间
- 异常/边缘分支放右边

### 6.3 跨层连线

当连线需要跨越多个层级时：

```
❌ 直接斜穿 → 与其他节点交叉
✅ 先水平 → 再垂直 → 再水平（正交路由）
```

---

 七、完整流程图生成检查清单（🚨 强制必须全部通过）

生成后逐项检查，**任何一项不通过都必须修正后才能交付**：

- [ ] 节点间距 ≥ 200px（水平）/ ≥ 150px（垂直）
- [ ] 同一层级节点 y 坐标相同（10px精度内）
- [ ] 决策节点出口方向分散（不挤在同一侧）
- [ ] 连线文字使用 edgeLabel（非 value）
- [ ] **连线文字位置精确**：水平连线标签在上方（y=-2），垂直连线标签在右侧
- [ ] 文字标签不与节点/连线重叠
- [ ] 虚线仅用于条件/备注
- [ ] 背景色块覆盖完整分组
- [ ] 画布大小足够（pageWidth/pageHeight）
- [ ] **连线不穿过任何非源/目标节点**（这是最常见的质量问题）
- [ ] **连线不交叉**（两条连线在空间上不应交叉绕行）
- [ ] **所有连线使用 orthogonalEdgeStyle 正交路由**（禁止任何斜线/歪曲线）
- [ ] 整体布局从左到右、从上到下流动自然

**连线穿节点检测方法**：生成drawio后，逐条连线检查其路径是否经过任何非源非目标节点的矩形范围。如果经过，必须添加 waypoint 绕开或增大节点间距。

**连线交叉检测方法**：检查任意两条连线的正交路径段是否在空间上交叉。如果交叉，必须调整布局消除交叉。

---

## 八、XML 生成模板

### 8.1 基础结构

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="Electron">
  <diagram name="Page-1">
    <mxGraphModel dx="1285" dy="772" 
                  grid="1" gridSize="10" 
                  pageWidth="1600" pageHeight="1200">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        
        <!-- 节点和连线在这里 -->
        
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

### 8.2 节点模板

```xml
<!-- 开始节点 -->
<mxCell id="start" parent="1" 
        style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=12;" 
        value="开始" vertex="1">
  <mxGeometry x="100" y="50" width="120" height="50" as="geometry" />
</mxCell>

<!-- 处理步骤 -->
<mxCell id="step1" parent="1" 
        style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;" 
        value="处理步骤" vertex="1">
  <mxGeometry x="100" y="150" width="130" height="50" as="geometry" />
</mxCell>

<!-- 决策节点 -->
<mxCell id="decision" parent="1" 
        style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=11;" 
        value="决策?" vertex="1">
  <mxGeometry x="100" y="250" width="140" height="70" as="geometry" />
</mxCell>
```

### 8.3 连线模板（带 edgeLabel）

```xml
<!-- 连线 -->
<mxCell id="e1" edge="1" parent="1" 
        source="decision" target="step2" 
        style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;fontSize=11;exitX=0;exitY=0.5;entryX=0.5;entryY=0;" 
        value="">
  <mxGeometry relative="1" as="geometry" />
</mxCell>

<!-- 连线文字标签 -->
<mxCell id="label-e1" connectable="0" parent="e1" 
        style="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;points=[];" 
        value="通过" vertex="1">
  <mxGeometry relative="1" x="0.5" y="-2" as="geometry">
    <mxPoint as="offset" />
  </mxGeometry>
</mxCell>
```

---

## 九、常见错误对照表

| 错误 | 现象 | 正确做法 |
|---|---|---|
| 节点密集 | 线被迫弯曲、交叉 | 加大间距（≥120px） |
| 出口方向不分散 | 多条线从同一侧挤出来 | 分配不同方向（左/下/右） |
| 连线文字用 value | 文字和线重叠、位置难控制 | 用 edgeLabel 子元素 |
| 无背景分组 | 流程结构不清晰 | 添加 bg1/bg2/bg3 色块 |
| 画布太小 | 内容被截断、拥挤 | 增大 pageWidth/pageHeight |
| 决策节点出口用 exitX/Y 默认值 | 线从奇怪位置出 | 显式指定 exitX/Y |
| 虚线和实线混用无规律 | 条件判断不明显 | 虚线=条件，实线=主流程 |

---

## 十、快速生成口诀

> **间距够，线直走；**
> **出口散，不交叉；**
> **文字用 label，不用 value；**
> **先布局，后连线；**
> **分组色块要明显。**

---

## 附录：坐标计算参考

### 水平展开（决策节点4分支）

```
决策节点: x=1000, y=300, w=140, h=70
中心: (1070, 335)

分支1（左）:    x=800,  y=400   (出口左)
分支2（下左）:  x=1000, y=450   (出口下偏左)
分支3（下右）:  x=1200, y=450   (出口下偏右)
分支4（右）:    x=1400, y=400   (出口右)
```

### 垂直间距

```
Layer 1: y=50
Layer 2: y=150 (间距 100)
Layer 3: y=250 (间距 100)
Layer 4: y=380 (间距 130，决策后需要更大空间)
Layer 5: y=500 (间距 120)
```