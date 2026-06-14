---
name: prd-drawio-gen
description: 图纸生成skill（prd-v3内部子Skill）。输入蓝图§A节点/连线表，输出标准的.drawio XML文件。当PRD中需要精确排版的架构图/流程图/泳道图时使用。注意：与系统级 drawio-skill（外部Skill，提供通用drawio操作能力）不同，本Skill专注于PRD文档场景的图纸生成。
provides: [PRD图纸生成]
depends_on:
  - skill: drawio-skill
    purpose: 底层 drawio XML 操作与校验
    optional: true
    degradation: "drawio-skill 不可用时仍可生成 Mermaid 中间态预览"
---

# 图纸生成 Skill

## 定位

PRD 蓝图确认后的执行步骤。输入蓝图§A的节点定义表+连线定义表，输出标准的 `.drawio` XML 文件。

**核心价值**：把蓝图变成可交付的图纸，精确控制节点位置、连线路由、配色排版。

## 执行流程（4步闭环）

### Step 1: 读取蓝图 + 清理历史

输入：`output/[项目名]/blueprint/[项目名]-blueprint.md`

清理历史文件：
```bash
# 保留 .drawio 源文件，删除其他
rm -f output/[项目名]/drawio/*.png
rm -f output/[项目名]/drawio/*.svg
rm -f output/[项目名]/drawio/*.bkp
```

### Step 2: 生成 XML

按蓝图§A节点表+连线表，生成标准 drawio XML：

```xml
<mxfile>
  <diagram>
    <mxGraphModel>
      <root>
        <!-- 泳道 -->
        <!-- 节点 -->
        <!-- 连线 -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

**生成规则**：
- 节点位置：严格按蓝图坐标
- 连线类型：实线(dashed=0) / 虚线(dashed=1)
- 连线路由：orthogonalEdgeStyle
- 配色：按层级统一

### Step 3: 导出 PNG + 自检

导出：
```bash
D:/draw.io/draw.io.exe -x -f png -e -s 2 -o output.png input.drawio
```

自检清单（16项）：
| # | 检查项 | 状态 |
|---|--------|------|
| 1 | 纵向对齐 | |
| 2 | 间距均等 | |
| 3 | 路由走廊 | |
| 4 | 实线/虚线正确 | |
| 5 | 连线文字合规 | |
| 6 | 锚点统一 | |
| 7 | 正交走线 | |
| 8 | 连线不穿节点 | |
| 9 | 菱形分支标注 | |
| 10 | 起止椭圆 | |
| 11 | 无孤立节点 | |
| 12 | 无双向箭头 | |
| 13 | Ontology独立泳道 | |
| 14 | 配色一致 | |
| 15 | 图例完整 | |
| 16 | 绝对禁止项 | |

### Step 4: 修复循环

发现 ❌ → 修复 → 再导出 → 直到全 ✅

**最大修复次数**：3次，超过暂停说明。

## 与 prd-v3 的关系

```
PRD 确认
    ↓
蓝图§A节点/连线表锁定
    ↓
调用 drawio-gen
    ↓
产出 .drawio + .png
```

## 与 drawio-skill 的关系

- **drawio-skill**：提供 XML 生成规则、校验脚本、导出工具
- **drawio-gen**：调用 drawio-skill 执行具体生成任务

## 输出目录

```
output/[项目名]/drawio/
├── [项目名]-architecture.drawio    # 架构图
├── [项目名]-architecture.png
├── [项目名]-flowchart.drawio       # 流程图
├── [项目名]-flowchart.png
├── [项目名]-swimlane.drawio        # 泳道图
└── [项目名]-swimlane.png
```
