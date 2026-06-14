---
name: frontend
description: "场景驱动前端生成——偏好感知→场景判定→设计选配→CSS变量体系→骨架优先→代码生成→硬门禁自检→打磨迭代。AI做选择题，用户在浏览器看真实渲染。"
provides: [前端页面生成, 前端设计策略]
depends_on:
  - skill: impeccable
    purpose: CLI确定性反模式检测（WCAG对比度数学计算+30+规则确定性扫描）
    fallback: impeccable未安装时跳过CLI检测，仅AI自检，标注"⚠️ 未经CLI确定性验证"
---

# Frontend Skill v3 — 场景驱动 · 偏好感知 · 骨架优先

> **核心理念不变**：AI 不懂"好品味"，只懂"从给定选项中选一个"。v3 新增：记住你的偏好、先骨架后血肉、CSS变量体系。
> **模块化**：本文件包含完整执行流程（~350行）。色板/字体数据库、41条纪律规则、自检清单等数据附录在 `reference/` 中按需加载。

## 触发条件

涉及前端页面生成即触发：建页面、做 landing page、写 dashboard、打磨 UI、改造已有网站。不适用于纯后端任务。

---

## 执行流程总览

```
Step 0   启动预览服务（所有场景必做，会话级一次）
Step 1   场景判定 + 技术栈识别 + 偏好加载
Step 1.5 偏好路由 → 🥇静默预选 / 🥈高亮推荐 / 🥉冷启动
Step 2   设计选配 → 输出设计简报（含 CSS 变量块）
Step 3   骨架生成（4A：布局+占位+CSS变量）→ 用户确认布局 ✓
Step 4   血肉填充（4B：真实内容+交互+动效）→ 覆盖写入 index.html
Step 4.5 ⛔ 硬门禁：自检报告 + impeccable CLI（必须在对话中逐项输出）
Step 4.6 主动 offer 打磨选项 → 用户选择或确认完成 → 更新偏好记录
Step 5   用户反馈 → 微调 → 覆盖写入 → 刷新即看 → 回到 Step 4.5
```

**每次代码改动后强制**：Step 4.5 自检必须在对话中完整输出。Step 4.6 自检通过后必须主动询问用户是否打磨。

**预览服务贯穿全程**：Step 0 启动后一直运行。AI 通过对话接收用户反馈，修改后覆盖写入 `index.html`。

---

## Step 0: 启动预览服务（所有场景必做）

v3 将预览服务提升为独立步骤，不再捆绑在任何场景子流程中。

```bash
node .claude/skills/frontend/scripts/dev-server.mjs
```

- 零外部依赖，仅 Node.js 内置模块
- 自动端口检测（默认 3333，被占用则递增）
- 后台运行，服务已在运行时不重启
- **启动前检查 `node --version`**：不可用时提示用户安装 Node.js
- 启动后告知用户：`🔌 预览服务已启动：http://localhost:3333`

---

## Step 1: 场景判定 + 技术栈识别 + 偏好加载

### 1.1 场景判定

根据用户描述判定场景，决定后续设计策略：

| 场景 | 触发信号 | 策略关键词 | 是否追问 |
|------|---------|-----------|:--:|
| **Dashboard/工具** | 后台管理、数据面板、配置页、admin | 功能优先、信息密集、紧凑间距 | 否 |
| **Landing/品牌页** | 着陆页、官网、产品介绍、营销 | 视觉冲击、品牌感、说服漏斗 | 可选（品牌人格） |
| **Creative/作品集** | 作品集、portfolio、创意、个人网站 | 风格表达、视觉个性、记忆点 | **是**（风格方向） |
| **展示/PPT式** | 精美、演示、汇报、PPT风格 | 大字体、少文字、强层次 | 否 |
| **通用** | 无法判定 | 保守平衡 | 否 |

### 1.2 技术栈识别

检查项目已有文件：`tailwind.config.*` → Tailwind；`components.json` → shadcn/ui；`*.tsx`/`*.jsx` → React；`*.vue` → Vue；只有 `*.html` → 纯 HTML/CSS。

检测到组件库时提示用户（如"检测到 shadcn/ui，建议使用 `<Button>` 组件"），但不强制。

### 1.3 偏好加载

读取 `preferences.json`，按当前场景过滤历史偏好。偏好路由规则见 Step 1.5。

---

## Step 1.5: 偏好路由

根据历史偏好决定设计选配的交互深度：

| 条件 | 等级 | 行为 |
|------|:--:|------|
| 同场景最近 5 次中 ≥4 次选同一色板/字体 | 🥇 **静默预选** | 跳过 picker，直接输出设计简报。告知用户"根据你的偏好选择了 [色板]+[字体]" |
| 同场景有历史记录但不达 80% | 🥈 **高亮推荐** | 显示 picker，推荐项标注 🔥 + 置顶 + 一句话理由 |
| 新场景 / 无历史数据 | 🥉 **冷启动** | 标准 picker，无偏好标记 |

**反偏好**：`antiPreferences` 中的色板/字体/模式自动排除或降权。用户选了反偏好项时提示"你之前标注过不喜欢这个选项，确认？"

**场景感知**：偏好按 scene 维度独立记录——Landing 偏好石墨色板不影响 Dashboard 偏好蓝钢色板。

---

## Step 2: 设计选配

### 2.0 Brief Inference（必做）

从用户描述中提取信号，输出设计判读 + 架构判读：

```
🎯 设计判读：[页面类型] for [目标用户]，[风格关键词]语言，倾向 [设计方向]
🏗️ 架构判读：[单页/多页] · [纯静态/需后端/需CMS] · Section: [列表]
```

**设计信号**（缺失的标注"未指定"）：
1. 页面类型 → 先查品类速查表（`reference/brief.md`），命中则套用默认架构
2. 风格词 → 用户说的形容词（极简/活力/专业/优雅/暗色/...）
3. 参考信号 → 用户提到的竞品/品牌/URL
4. 受众 + 约束 → B2B/B2C/招聘方；无障碍/监管行业等

**架构推断纪律**：品类命中→套用默认值→展示确认；品类模糊→最多只问一个问题→展示确认。

**内容确认**：架构确认后，将 Section 清单展示给用户确认每个 Section 放什么内容：

```
📋 页面结构预览：
| Section | 内容 | 呈现形式 |
|---------|------|---------|
| Hero    | ... | ... |
```

用户说"可以"后进入设计选配。品类速查表详见 `reference/brief.md`。

### 2.1 场景策略路由

| 场景 | 子流程 | 是否追问 |
|------|--------|:--:|
| Dashboard | → 2.2 | 否 |
| Landing | → 2.3 | 可选（品牌人格） |
| Creative | → 2.4 | **是**（风格方向） |
| Presentation | → 2.5 | 否 |
| General | → 2.6 | 否 |

### 2.2 Dashboard 流程

**策略**：功能优先。色板候选：蓝钢 `#2563EB`、墨绿 `#059669`、暗黑 `#818CF8`、石墨 `#374151`。字体候选：Inter、DM Sans、Space Grotesk、JetBrains Mono（等宽数字）。密度：紧凑。

完整色板/字体数据见 `reference/palettes.md` 和 `reference/fonts.md`。

### 2.3 Landing 流程

**策略**：品牌表达优先。可选品牌人格 Q&A（用户未明确风格方向时问）：
> "这个品牌更接近哪种感觉？极简克制(如 Linear) / 温暖手工(如 Patagonia) / 科技前卫(如 Vercel) / 经典专业(如 Stripe)"

按人格映射色板+字体（详见 `reference/palettes.md` §Landing映射）。密度：标准-宽松。

**Landing 专属规则**（Step 4 强制执行）：
- Hero 适配首屏：标题 ≤2行/≤8词，副标题 ≤20词，CTA 可见无需滚动
- Hero 顶部 padding ≤ `pt-24`，内最多 4 个文字元素
- Logo墙在 Hero **下方**独立区域，只用 logo 不印行业标签
- CTA 桌面端不换行（≤3词），一个意图一个标签
- 禁止三列等大功能卡片 / Section 布局不重复 / Zigzag ≤2连续 / Split-Header

### 2.4 Creative 流程

**策略**：风格表达优先。**视觉 picker 一步直出**（不串行两轮选择）。

#### 2.4.1 生成风格选择器

生成 `style-picker.html`，展示 6 种风格的视觉对比（微型 Hero 预览 + 特征标签 + 代表品牌）：

| # | 风格 | 视觉特征 | 代表 |
|---|------|---------|------|
| 1 | 极简白 | 大量留白、细体标题、克制单色 | Linear, Apple |
| 2 | 粗野主义 | 高饱和底色、粗体大标题、raw 边框 | brutalistwebsites.com |
| 3 | 编辑式 | 衬线体、网格线背景、非对称居中 | NYT, Kinfolk |
| 4 | 暗色沉浸 | 深色底+微光晕、渐变文字、发光边框 | Stripe, Vercel |
| 5 | 复古暖色 | 暖色底+纹理点阵、印章边框 | Patagonia, Filson |
| 6 | 实验性 | 非常规布局、霓虹色、变形元素 | Awwwards 实验类 |

picker 交互：点击卡片选中 → 底部 fixed 确认栏 → 点击"确认选择"。

#### 2.4.2 风格 → 默认色板+字体（一步直出）

用户选定风格后，不生成第二轮 picker。直接用默认组合进入代码生成（详见 `reference/palettes.md` §Creative映射）。

#### 2.4.3 逃生舱

> 🎨 用了「[默认色板]+[默认字体]」组合。不满意？告诉我换一套——直接覆盖写入，刷新即看。

微调纪律：一次只换一个维度（色板或字体）；连续换 3 次仍不满意→建议重选风格。

**Creative 专属规则**（Step 4 强制执行）：
- 反中心对齐（极简白除外）/ 允许 Motion 强度 ≥6 / 禁止默认三列等大卡片
- Section 布局不重复 / 每 3 个 Section 最多 1 个 Eyebrow

### 2.5 Presentation 流程

**策略**：叙事驱动。色板：蓝钢、深靛、暗黑、石墨（高对比度优先）。字体：Sora、DM Sans、Space Grotesk、Inter。密度：极简（每屏 ≤3句话）。

### 2.6 General 流程

**策略**：保守平衡。色板：石墨、蓝钢、海蓝、墨绿。字体：Inter、DM Sans、Satoshi、Sora。密度：标准。

### 2.7 设计简报输出（含 CSS 变量块——v3 新增）

选完后输出设计简报 + **CSS 变量块**。代码生成时所有颜色必须引用 `var(--xxx)`，禁止硬编码 hex。

```css
:root {
  --color-primary: #2563EB;      /* 主色 */
  --color-bg: #F8FAFC;           /* 页面背景 */
  --color-surface: #FFFFFF;      /* 卡片/面板背景 */
  --color-text: #1E293B;         /* 正文 */
  --color-text-muted: #64748B;   /* 辅助文字 */
  --color-border: #E2E8F0;       /* 边框/分割线 */
  --color-accent: #F59E0B;       /* 强调色（CTA/高亮） */
  --font-display: 'Sora', 'PingFang SC', sans-serif;
  --font-body: 'Inter', 'PingFang SC', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --spacing-unit: 4px;
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
}
```

Token 映射规则：色板数据库的 7 个颜色字段 → CSS 变量 7 个语义 Token。详见 `reference/palettes.md` §Token映射。

### 2.8 生成可视化选择器

**Creative 场景**：Step 2.4 已通过 `style-picker.html` 完成风格选择并直出默认组合，跳过本节。

**其他场景**：设计简报确定后，生成 `picker.html` 到 `.claude/preview/`：

- **色板选择区**：每个候选 7 色块横向排列 + 微型 UI 预览（标题+正文+按钮）+ 名称标签。偏好推荐项 🔥 标注 + 置顶
- **字体选择区**：英文/中文标题+正文样本 + 代码样本。偏好推荐项 🔥 标注 + 置顶
- **底部确认栏**（fixed bottom）：显示当前选择 + "确认选择"按钮

告知用户：`🔌 请在浏览器打开 http://localhost:3333/picker.html 选择色板和字体`

---

## Step 3: 骨架生成（4A——v3 新增）

**先搭骨架，验证通过后再填血肉。** 骨架阶段只做布局结构 + 占位内容。

→ 加载 `reference/skeleton.md` 获取详细骨架规范。

### 3.1 产出内容

- 完整 HTML 布局结构（所有 Section 的位置和容器）
- CSS 变量块（`:root` 已注入）
- 占位内容：灰色块代替图片、lorem ipsum 代替文案、真实标题占位符
- 无交互逻辑、无动效、无真实配色细节

### 3.2 骨架验证门禁

- [ ] 四断点不掉落（375px / 768px / 1024px / 1440px）
- [ ] Section 顺序符合设计简报
- [ ] 所有 `var(--xxx)` 引用有效（无未定义 Token）
- [ ] 无 `h-screen`（已用 `dvh`），固定元素有 `safe-area-inset`
- [ ] 中文字体栈存在：`"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`
- [ ] `<meta name="viewport">` 存在

### 3.3 确认流程

展示骨架 → 用户确认布局 ✓ → 进 Step 4。用户要求调整 → 修改骨架 → 重新确认。

---

## Step 4: 血肉填充（4B——v3 新增）

骨架确认后，替换真实内容 + 交互 + 动效 + 视觉打磨。

→ 加载 `reference/rules.md` 获取 41 条纪律规则（分视觉/布局/动效/内容/技术5类）

### 4.1 必须加载的组件

→ 加载 `reference/checklists.md` 获取场景门控组件清单 + 交互模式速查

### 4.2 代码生成纪律

**CSS 变量强制**（v3 新增）：所有颜色必须用 `var(--color-xxx)`，禁止硬编码 hex、禁止 `text-[#123456]`。

其余 41 条纪律规则在 `reference/rules.md` 中（视觉 #1-10、布局 #11-21、动效 #22-27、内容 #28-35、技术 #36-41）。核心禁令在此重申：

- ❌ 紫色/多色渐变 / 纯灰文字 / bounce缓动 / glow扩散 / 卡片嵌套 / emoji当icon
- ❌ 三列等大功能卡片 / Section布局重复 / Split-Header / h-screen
- ❌ em-dash (`—`) / 滚动提示(`Scroll down`) / 版本标签 / 装饰圆点
- ❌ 伪造精确数字(`92%`/`4.1×`) / 滚动监听(`window.addEventListener('scroll')`)

### 4.3 写入 + 预览

覆盖写入 `.claude/preview/index.html`。告知用户：
> ✅ 页面已生成 → http://localhost:3333/index.html （刷新浏览器查看）

---

## Step 4.5: ⛔ 硬门禁——自检报告 + impeccable CLI

**规则**：代码写入后必须先输出完整自检报告（逐项 ✅/❌），所有 ❌ 修复后重新打勾，全部 ✅ 后才能告知用户"页面已完成"。**跳过自检直接声称完成 = 违规。**

→ 加载 `reference/self-check.md` 获取完整自检清单（7大类 × N项）。

### impeccable CLI（必跑——已安装时）

```bash
node .claude/skills/impeccable/scripts/detector/detect-antipatterns.mjs .claude/preview/ --json
```

impeccable 未安装时：跳过 CLI，标注"⚠️ 未经 CLI 确定性验证"，仅执行 AI 自检。

自检失败的项必须修复后重新打勾，最多 3 轮修复。3 轮后仍有 ❌ → 报告中标注"已知限制"并说明原因。

---

## Step 4.6: 主动 offer 打磨 + 偏好更新

自检全部 ✅ 后，AI 必须主动在对话中列出打磨方向：

> ✅ 自检通过。是否需要打磨？可选方向：**polish**（收紧间距/过渡）· **bolder**（强化视觉冲击）· **quieter**（收敛更安静）· **distill**（精简约化）——或者直接确认完成。

| 用户说 | 操作 | 具体做法 |
|--------|------|---------|
| "打磨一下"/"润色" | **polish** | 检查间距节奏、对齐精度、hover 过渡、阴影 tint、排版层级 |
| "太素了"/"单调" | **bolder** | 加大字号跨度、增加强调色面积、强化动效节奏、加视觉记忆点 |
| "太花哨了"/"太吵" | **quieter** | 减动画、收强调色、统一下沉色调、去装饰元素 |
| "简化一点"/"太多东西" | **distill** | 去除非必要元素、合并重复信息、减少视觉层级到 ≤3 层 |

→ 深度打磨时建议用户运行 `/impeccable polish`（逐元素审查+live模式）。

### 偏好更新

用户确认完成后，更新 `preferences.json`：
- 记录本次选择的色板/字体/风格（count +1，更新 lastUsed）
- 如果用户本轮换了选项（如从石墨换到深靛），旧选择不降权但新选择 count +1
- 如果用户反馈"太花哨"/"太素"，对应选项加入 antiPreferences 降权

---

## Step 5: 迭代

→ 加载 `reference/iteration.md` 获取迭代纪律（I1-I6）

用户反馈 → 微调 → 覆盖写入 `index.html` → 用户刷新 → 回到 Step 4.5

### 迭代核心纪律

| # | 规则 |
|---|------|
| I1 | **只改用户明确要求的元素**——说"改字体"就只换字体引用 + font-family |
| I2 | **局部编辑优先，禁止全文重写**——用 Edit 工具精准替换 |
| I3 | **改前确认改动范围**——"改了 X，不会动 Y 和 Z" |
| I4 | **保留已确认的设计锚点**——上一轮用户认可的视觉元素视为已锁定 |
| I5 | **违反内容纪律的默认值立即修正**——em-dash、滚动提示、装饰圆点等 |
| I6 | **多 Section 重设计时先生成独立预览**（`section-preview.html`）→ 隔离迭代 → 通过后合入 |

### 迭代反模式（发生过，记录以防范）

| 反模式 | 正确做法 |
|--------|---------|
| 修小改大：用户要"去 nav"，AI 连 Hero CTA+宽度+动效全改 | 明确改动边界 |
| 全文重写：每次微调用 Write 全量覆盖 | 用 Edit 精准替换 |
| 静默退化：重写时丢失已确认的视觉锚点 | 重写前盘点锚点清单，写入时逐项核对 |

---

## 🤖 Auto-Confirm 模式（编排者/subagent 调用）

当 frontend 在 subagent 或自动化流水线中被调用时，所有交互确认步骤无法执行。Auto-Confirm 模式提供零交互降级路径。

**启用方式**：在调用 prompt 中包含 `--auto-confirm` 标志。

**行为变化**：

| 交互点 | 正常模式 | Auto-Confirm 模式 |
|--------|---------|-------------------|
| Step 1.5 偏好路由 | 按历史偏好静默/高亮/冷启动 | 🥇 静默预选生效时直接用；🥈🥉 用场景默认值（Dashboard→蓝钢+Inter，Landing→石墨+Inter，Creative→极简白，Presentation→蓝钢+Sora，General→石墨+Inter） |
| Step 2 设计选配 | 生成 picker.html 等待用户选择 | 用 Step 1.5 结果，直接输出设计简报（含 CSS 变量块），跳过 picker |
| Step 3 骨架确认 | 展示骨架 → 等待"布局 OK"确认 | 跳过确认，直接进 Step 4 |
| Step 4.5 自检 | 逐项 ✅/❌，最多 3 轮修复 | 单轮自检通过→继续 / 失败→标注"⚠️ Auto-Confirm 模式：自检未通过，已记录"→继续 |
| Step 4.6 打磨 | 主动 offer 4 方向 + 等待选择 | 跳过，直接完成 |
| Step 5 迭代 | 等待用户反馈 → 微调 | 跳过（无用户可反馈） |

**场景默认值速查**：

| 场景 | 默认色板 | 默认字体 | 密度 |
|------|---------|---------|:--:|
| Dashboard | 蓝钢 `#2563EB` | Inter | 紧凑 |
| Landing | 石墨 `#374151` | Inter | 标准-宽松 |
| Creative | 极简白（Linear 风格） | Inter | 宽松 |
| Presentation | 蓝钢 `#2563EB` | Sora | 极简 |
| General | 石墨 `#374151` | Inter | 标准 |

**完成信号**：Auto-Confirm 模式完成后输出 `.claude/preview/.frontend-auto-complete.json`：

```json
{
  "status": "completed",
  "scene": "dashboard",
  "auto_decisions": [
    { "step": "palette", "decision": "blue-steel", "basis": "scenario_default" },
    { "step": "font", "decision": "Inter", "basis": "scenario_default" },
    { "step": "skeleton_confirm", "skipped": true },
    { "step": "polish", "skipped": true }
  ],
  "self_check": { "passed": true, "warnings": [] },
  "output": ".claude/preview/index.html",
  "completed_at": "ISO8601"
}
```

---

## 与 impeccable 的关系

| 能力 | 谁提供 | 何时用 |
|------|--------|--------|
| 场景判定→设计选配→骨架→血肉 | **frontend v3** | 始终 |
| AI 自检 | **frontend v3** Step 4.5 | 始终 |
| WCAG 对比度 + 反模式确定性检测 | **impeccable CLI** | Step 4.5（已安装时必跑） |
| 深度打磨（逐元素审查+live模式） | **impeccable** (`/impeccable polish`) | 用户主动触发 |

- **v3 声明 `depends_on: impeccable`**：诚实化实际依赖关系
- **impeccable 未安装时**：跳过 CLI 检测，仅 AI 自检，标注"未经 CLI 确定性验证"
- **预览端口不冲突**：frontend 3333 / impeccable live 8400
- **两个 Skill 独立触发**：`/frontend` 做生成，`/impeccable polish` 做深度打磨

---

## 文件管理

### 目录约定

```
<项目根目录>/.claude/preview/
├── style-picker.html  # Creative 场景风格选择器
├── picker.html        # 其他场景色板+字体选择器
└── index.html         # 生成的页面（每次覆盖）
```

### 偏好文件

```
~/.claude/skills/frontend/preferences.json   # 用户偏好记忆（不提交 git）
```

### 文件纪律

- **固定文件名**：不版本后缀（`index-v2.html`、`index-final.html` 等）
- **每次覆盖**：修改后覆盖写入同名文件，用户刷新即看
- **`.gitignore`**：项目添加 `.claude/preview/`
- **Creative 场景**：`style-picker.html` 同样写入 `.claude/preview/`，通过 Step 0 的 dev-server 访问

---

## 反模式速查（生成时必避）

完整反模式表见 `reference/antipatterns.md`。核心禁令在此速查：

| 反模式 | 表现 | 正确做法 |
|--------|------|---------|
| 紫色渐变 | `from-purple-500 to-pink-500` | 从色板选主色做单色渐变或实色 |
| 纯灰文字 | `text-gray-500` / `#808080` | 用色板的文字辅色（已 tint） |
| bounce 动画 | `animation: bounce 2s infinite` | `transition: 200ms cubic-bezier(0.16, 1, 0.3, 1)` |
| 三列等大卡片 | icon+heading+text × 3 水平排列 | 2列zigzag / 非对称网格 / 横向滚动 |
| 卡片嵌套 | `<Card><Card><Card>` | 外层卡片→内部用 `bg` 变化 + `border` + 间距 |
| h-screen 跳动 | `h-screen` / `100vh` | `h-dvh` / `min-h-dvh` |
| 滚动提示 | `Scroll down` / `↓ scroll` | 用户知道怎么滚动，去掉 |
| em-dash | 标题/正文中 `—` 作为分隔 | 句号/逗号/冒号替代 |
| 假精确数字 | `92%`/`4.1×` 无数据来源 | 有真实数据才写数字 |
| CTA 重复意图 | "联系我们"+"取得联系"同时出现 | 一个意图只留一个标签 |
| Eyebrow 泛滥 | 每个 Section 都 uppercase tracking | 每 3 个 Section 最多 1 个 |
| Hero 纯文字 | 只有文字+渐变背景 | 用真实图片/生成图片/组件预览 |
