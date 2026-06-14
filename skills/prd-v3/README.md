# PRD Generator v3

> 产出标准驱动的 PRD 生成 Skill。支持轻量和完整两种模式，包含风控行业模板，产出物可直接作为开发契约使用。
>
> **技术方案**：已独立为 `tech-spec` Skill（编排 frontend + backend-dev 生成技术规格文档），PRD 只写 What & Why。

## 📂 Skill 目录结构

```
.claude/skills/prd-v3/
├── SKILL.md                      # ⬅️ Skill 主入口文件（7 步流程编排）
├── README.md                     # 本文件
├── config/                       # 配置驱动（权重、阈值、关键词映射）
│   ├── engine.json               # 推荐引擎配置
│   └── quality.json              # 质量评估配置
├── knowledge/                    # 知识库（画像、索引、配色）
│   ├── profile.json              # 用户画像与偏好记录
│   ├── templates/                # 模板索引
│   ├── diagrams/                 # 图表库（推荐矩阵、分类规则、配色方案）
│   └── industry/                 # 行业知识索引
├── prompts/                      # Claude 行为规则（4 个行为脚本）
│   ├── recommend.md              # 智能推荐行为规则
│   ├── enhance.md                # 内容增强行为规则
│   ├── recovery.md               # 异常场景应对规则
│   └── html-output.md            # HTML 输出行为规则
├── templates/                    # PRD 模板库
│   ├── complete/                 # 完整模式模板
│   ├── lightweight/              # 轻量模式模板
│   ├── exploration/              # 探索备忘录模板
│   └── shared/                   # 共享子模板（交互规格/数据字段/埋点/风险/Agent）
├── checklists/                   # 完整性检查 + 量化评分（双轨体系）
├── industry/                     # 行业模板
│   └── risk-control/             # 风控行业（通用模块/安全标准/字段示例/Agent 模式）
├── workflow/                     # 工作流定义
├── standards/                    # 标准规范
│   ├── flowchart-standard.md     # 流程图标准规范（drawio 渲染+连线）
│   ├── flowchart-standard.html   # 流程图标准 HTML 参考
│   ├── flowchart-guidelines.md   # 流程图生成准则（AI 用）
│   ├── diagram-spec.md           # PRD 全套附图规范手册（4 大类图纸+放置规则+自检清单）
│   ├── blueprint-spec.md         # 视觉产出蓝图模板结构
│   ├── html-style-standard.md    # 阿里云简约风格 CSS 规范
│   └── html-editable-spec.md     # 可编辑 HTML 交互规格
└── sub-skills/                   # 子 skill（flow-planning/requirement-review/prototype-design/drawio-skill）
```

## 📂 产出物目录结构（项目工作区）

产出物保存在项目工作区 `output/[项目名]/` 下：

```
output/[项目名]/
├── [项目名]-PRD.md              # PRD 正文
├── [项目名]-scoring.md          # 评分报告
├── exploration/                 # 探索备忘录
├── blueprint/                   # 视觉产出蓝图（Step 3.5）
├── html/                        # HTML 导出（Step 6）
├── drawio/                      # drawio 3 大图（Step 6）
├── prototype/                   # 前端 Demo（Step 6）
└── scripts/                     # 项目专属生成脚本
```

## 🚀 快速开始

### 1. 生成 PRD

在 Claude Code 中直接说出你的需求即可，prd-v3 会自动识别模式并推荐模板：

> "帮我写一个风控策略管理系统的 PRD"
> → AI 自动推荐：完整模式 + 风控行业模板

> "我想做一个内部用的数据分析工具，先出个 MVP"
> → AI 自动推荐：轻量模式 + 通用模板

> "我有个想法，做一个智能客服，值不值得做？"
> → AI 自动推荐：探索备忘录模式

产出物自动保存到 `output/[项目名]/`，包含 PRD 正文 + 评分报告。

### 2. 从 PRD 生成技术方案

> "基于这个 PRD 出技术方案"
> → 路由到 `tech-spec` Skill（编排 frontend + backend-dev 生成技术规格文档）

### 3. 评审已有 PRD（内容深度）

> "评审一下 output/风控系统/风控系统-PRD.md"

prd-v3 自动编排 deep-review 进行需求价值评审和方案对比评审。

### 4. 只检查完整性（格式）

> "检查一下这个 PRD 有没有漏东西"

prd-v3 用自身 checklist 做格式完整性检查，不触发深度评审。

## 📋 PRD 附图规范

详见 `standards/diagram-spec.md`，4 大类图纸标准：

| 图纸类型 | 核心作用 | PRD 章节 |
|---------|---------|---------|
| ①产品架构图 | 全局产品大盘、模块域划分 | §1 产品概述（汇报版）+ 附录（落地版） |
| ②业务流程图 | 单个业务全走向 | §3 各模块业务规则 |
| ③BPMN 泳道流程图 | 跨角色/跨系统协作分工 | §4 对接方案/接口说明 |
| ④产品原型图 | 前端页面交互落地 | §5 页面需求 |

信贷/AI 产品必加：⑤数据结构图 + ⑥接口清单图

## 📋 视觉产出蓝图

详见 `standards/blueprint-spec.md`，7 步流程新增 Step 3.5（生成视觉产出蓝图）：

| 蓝图模块 | 产出目标 | 核心内容 |
|---------|---------|---------|
| §0 共享定义 | 模块/角色/数据源 | 三张清单表，§A 和 §B 共用 |
| §A Drawio 蓝图 | 3 大架构图（drawio） | 节点+连线+层级+线型规则 |
| §B 前端 Demo 蓝图 | 可运行前端原型 | 页面+组件+交互+设计系统 |

**核心口诀**：下发调用实线、返回数据蛇线（架构图线型规则）

## 🔧 依赖工具

| 工具 | 用途 | 必需 |
|---|---|---|
| draw.io Desktop | 编辑/预览 drawio 文件 | 是 |
| Python 3.8+ | 运行生成脚本 | 是 |

## 📄 相关文件

- `SKILL.md` — Skill 主入口，包含执行流程
- `standards/diagram-spec.md` — PRD 全套附图规范手册
- `standards/blueprint-spec.md` — 视觉产出蓝图模板结构
- `standards/flowchart-guidelines.md` — 流程图生成详细准则
