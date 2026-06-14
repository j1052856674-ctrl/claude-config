#### drawio 3图并行生成流程（🚨 强制）

> 3大图（架构图、流程图、泳道图）彼此完全独立，**必须并行生成**，不得串行逐图等待。

**蓝图 → 图纸映射**：

| 蓝图章节 | 输出文件名 | 图纸类型 | 布局方向 |
|----------|-----------|---------|---------|
| §A1 产品架构图蓝图 | `[项目名]-architecture.drawio` | 3层架构图（TB） | 自上而下 |
| §A2 业务流程图蓝图 | `[项目名]-flowchart.drawio` | 业务流程图（TB） | 自上而下 |
| §A3 BPMN泳道流程图蓝图 | `[项目名]-swimlane.drawio` | BPMN泳道图（LR） | 从左到右 |

**线型规则口诀**：**下发调用实线、返回数据蛇线**
- 实线 (`dashed=0`)：上层调用下层、主流程流转 → `edgeStyle=orthogonalEdgeStyle;rounded=1;dashed=0`
- 蛇线/虚线 (`dashed=1`)：数据回传、降级、异步触发 → `edgeStyle=orthogonalEdgeStyle;rounded=1;dashed=1`

**并行执行模板**（每个 agent 调用 drawio-skill）：

```javascript
// Step 6: drawio 3图并行生成
export const meta = {
  name: 'prd-drawio-gen',
  description: '并行生成3个drawio图纸',
  phases: [
    { title: 'Generate', detail: '3个drawio图纸并行生成' },
    { title: 'Validate', detail: 'validate.py结构校验' },
    { title: 'Export', detail: 'PNG导出+自检' }
  ]
}

const projectName = '用户洞察智能体'
const blueprint = 'e:/prd/output/用户洞察智能体/blueprint/用户洞察智能体-blueprint.md'
const outputDir = `e:/prd/output/用户洞察智能体/drawio`

// Phase 1: drawio 生成前置：清理历史文件
// 🚨 强制：生成前删除 outputDir 下所有非 .drawio 文件（PNG/bkp/dtmp/svg/changelog等历史版本）
// 保留最终版 .drawio 源文件，避免历史文件堆积
import { readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
const files = readdirSync(outputDir)
files.filter(f => !f.endsWith('.drawio')).forEach(f => unlinkSync(join(outputDir, f)))

// Phase 2: 蓝图评审循环（🚨 强制，最多3次）
// 评审 Agent 检查蓝图逻辑完整性、异常覆盖、追问机制等
// 评审通过标准：diagram-drawio.md 附录 C8.3 检查清单 10 项全部 ✅
// 最大迭代：3 次，超过暂停说明

let reviewPassed = false
let reviewCount = 0
const maxReview = 3

while (!reviewPassed && reviewCount < maxReview) {
  reviewCount++
  const reviewResult = await agent(`评审蓝图 ${blueprint} 的逻辑完整性。对照 diagram-drawio.md 附录 C8.3 检查清单逐项检查：
1. 流程完整：从起点到终点全覆盖
2. 异常覆盖：超时/失败/降级/参数非法均已体现
3. 追问机制：触发条件+循环路径+回到主流程路径清晰
4. 节点粒度：同类合并、不同类拆分合理
5. 跨泳道交互：每个调用都有回传/回调
6. 追问循环：多次追问循环机制已体现
7. 异常闭环：每个异常分支都有落地节点
8. 主副流程分离：追问不污染主流程
9. 节点命名：无"XX完成"后缀
10. 起止节点：有开始+结束椭圆

输出评审报告：通过的项 + 不通过的项 + 修正建议。
如果全部通过，返回 "PASSED"。否则返回 "FAILED" + 修正建议。`, {
    label: `blueprint-review:${reviewCount}`,
    phase: 'Review'
  })
  
  if (reviewResult.includes('PASSED')) {
    reviewPassed = true
  } else {
    // 修正蓝图
    await agent(`根据评审建议修正蓝图 ${blueprint}。修正后重新评审。`, {
      label: `blueprint-fix:${reviewCount}`,
      phase: 'Review'
    })
  }
}

if (!reviewPassed) {
  throw new Error(`蓝图评审 ${maxReview} 次未通过，暂停 drawio 生成。请人工确认蓝图逻辑。`)
}

// Phase 3: 3图并行生成
const diagrams = [
  { section: 'A1', type: 'architecture', name: `${projectName}-architecture.drawio` },
  { section: 'A2', type: 'flowchart',    name: `${projectName}-flowchart.drawio` },
  { section: 'A3', type: 'swimlane',     name: `${projectName}-swimlane.drawio` }
]
const genResults = await parallel(diagrams.map(d => () =>
  agent(`调用drawio-skill生成${d.type}图纸。读取蓝图${blueprint}的§${d.section}部分，按照drawio-skill的XML结构规则、形状类型、配色方案、连线规范生成完整的.drawio XML文件，写入${outputDir}/${d.name}。线型规则：实线(dashed=0)用于下发调用/主流程，蛇线(dashed=1)用于数据回传/降级。布局方向：architecture=TB, flowchart=TB, swimlane=LR`, {
    label: `drawio:${d.type}`,
    phase: 'Generate'
  })
))

// Phase 2: validate.py 校验
const validResults = await parallel(genResults.filter(Boolean).map(r =>
  () => agent(`运行 python3 C:/Users/fanjiang/.claude/skills/drawio-skill/scripts/validate.py ${outputDir}/${r.filename}`, {
    label: `validate:${r.filename}`,
    phase: 'Validate'
  })
))

// Phase 3: PNG导出+自检（需要draw.io CLI）
// 如CLI可用则导出PNG+vision自检；否则交付XML+浏览器fallback URL
```

**每个并行 agent 的职责**：
1. 读取蓝图对应§A章节的节点定义 + 连线定义 + 布局策略
2. 严格按照 drawio-skill 的 XML 结构规则生成 `.drawio` 文件（形状类型、配色、边样式、容器规则）
3. 严格遵循蓝图连线表的线型（实线 vs 蛇线），不得自行判断
4. 严格遵循蓝图节点的层级/分组归属，不得自行调整
5. 写入完整 `.drawio` XML 到指定路径，返回 `{filename, success}` 结构化结果

**🚨 drawio 生成后必须自检闭环（强制执行）**：
> 详见 `standards/diagram-drawio.md` 附录 C7 自检闭环流程

1. **生成 → 导出 PNG → 自检评审 → 修复 → 再导出 → 交付**（禁止跳过自检直接交付）
2. **自检评审必须逐项对照 C7.2 泳道图专项检查清单**（15项全✅才交付）
3. **重点检查项**：纵向对齐(#1)、间距均等(#2)、锚点统一(#6)、正交走线(#7)、无孤立节点(#11)
4. **连续2轮自检仍有❌项目 → 暂停并说明**，不得无限循环修复
5. **交付前删除历史无效文件**（PNG/bkp/dtmp/svg/changelog），只保留最终 drawio 源文件和 PNG

**与 drawio-skill 的关系**：
- prd-v3 skill 负责**编排**（蓝图解析 + 并行调度 + 产出路径管理）
- drawio-skill 负责**执行**（XML生成规则 + 校验 + 导出 + 自检）
- 每个 agent 内部调用 drawio-skill（通过 Skill 工具或内联规则），不是凭空生成 XML