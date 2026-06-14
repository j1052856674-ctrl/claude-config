# 41 条纪律规则

> frontend v3 参考数据。SKILL.md Step 4 代码生成时按需加载。
> 按 5 类组织：视觉(10) / 布局(11) / 动效(6) / 内容(8) / 技术(6)

## 视觉纪律 (#1-10)

| # | 规则 | 为什么 |
|---|------|--------|
| 1 | **禁止紫色/多色渐变** | AI 默认指纹 #1，专业前端极少用 |
| 2 | **禁止纯灰色**（`#808080`/`gray-*`） | 中性色必须 tint——偏暖或偏冷 |
| 3 | **禁止 `bounce`/`elastic` 缓动** | 过时业余感，用 `cubic-bezier(0.16, 1, 0.3, 1)` |
| 4 | **禁止 `glow`/`box-shadow` 扩散做交互提示** | 廉价感，用背景色变化或边框替代 |
| 5 | **禁止卡片嵌套卡片** | AI slop 视觉惰性——用间距、背景色差、分割线区分层级 |
| 6 | **禁止 emoji 当 icon** | 用 Heroicons / Lucide / Phosphor / Tabler |
| 7 | **颜色必须来自设计简报色板** | 禁止随意发明颜色 |
| 8 | **色彩一致性锁定** | 全页一个强调色，暖灰/冷灰不混用，一个圆角体系 |
| 9 | **禁止纯黑 `#000` / 纯白 `#fff`** | 用 off-black（`#111827` 等）/ off-white（`#F8FAFC` 等） |
| 10 | **标题 `text-wrap: balance`，正文 `text-wrap: pretty`** | 防止孤行 |

## 布局纪律 (#11-21)

| # | 规则 | 为什么 |
|---|------|--------|
| 11 | **禁止 `h-screen`，用 `h-dvh` 或 `min-h-dvh`** | iOS Safari 地址栏折叠导致布局跳动 |
| 12 | **固定元素必须尊重 `safe-area-inset`** | 避免内容被刘海/底部指示条遮挡 |
| 13 | **禁止三列等大功能卡片** | AI slop 特征 #2，用 2列zigzag / 非对称网格 / 横向滚动替代 |
| 14 | **Section 布局不重复** | 同一布局类型全页最多 1 次。8 个 Section 至少 4 种不同布局 |
| 15 | **Zigzag 交替上限 2 个连续 Section** | 第 3 个连续 image+text split → 必须打破 |
| 16 | **禁止 Split-Header**（左大标题+右小段落） | 垂直堆叠标题+正文更清晰 |
| 17 | **Eyebrow 上限**：每 3 个 Section 最多 1 个 | 数 `uppercase tracking` 标签，超标即失败 |
| 18 | **Bento 格数 = 内容数** | N 个内容 → N 个格，无空格。至少 2-3 格有视觉变化（图片/渐变/图案） |
| 19 | **Logo墙在 Hero 下，只用 logo** | 不印行业标签，不放在 Hero 内 |
| 20 | **方形元素用 `size-*` 替代 `w-*`+`h-*`** | 更简洁，减少冗余 |
| 21 | **同类型相邻 Section 共享视觉模板** | 两个内容结构相似的相邻 Section，用同一套卡片/行模板，仅通过密度区分层级 |

## 动效纪律 (#22-27)

| # | 规则 | 为什么 |
|---|------|--------|
| 22 | **动画只动 `transform`/`opacity`** | 不动 `width`/`height`/`top`/`left`/`margin`/`padding` |
| 23 | **必须尊重 `prefers-reduced-motion`** | 无障碍基本要求 |
| 24 | **交互反馈 ≤200ms** | 超过 200ms 觉得"卡" |
| 25 | **禁止在非动画元素上设 `will-change`** | 预分配 GPU 层，不用时浪费显存 |
| 26 | **循环动画离屏时必须暂停** | IntersectionObserver 或 CSS `animation-play-state` |
| 27 | **禁止 `useEffect` 做渲染逻辑能表达的事** | 用 `useMemo`/计算，`useEffect` 是副作用逃生舱 |

## 内容纪律 (#28-35)

| # | 规则 | 为什么 |
|---|------|--------|
| 28 | **禁止伪造精确数字** | `92%`/`4.1×`/`48k` 除非来自真实数据 |
| 29 | **禁止滚动提示文字** | `Scroll down`/`↓ scroll`/`Scroll to explore` → 用户知道怎么滚动 |
| 30 | **禁止版本标签在 Hero 区** | `v0.6`/`BETA`/`EARLY ACCESS` → 除非是产品发布预告页 |
| 31 | **禁止 Section 编号** | `01 / About`/`002 · Process` → 用自然语言标题 |
| 32 | **禁止 em-dash (`—`) 和 section 符号 (`§`)** | LLM 风格指纹。em-dash 用句号/逗号/冒号替代；`§N` 用章节描述性名称替代（如 `§2`→"字段语义表"）。两者同为「技术文档习惯带入 UI」反模式 |
| 33 | **禁止装饰圆点** | 导航/列表/徽章前的彩色圆点 → 只用于真实语义状态 |
| 34 | **长列表禁止每行横线** | 10+ 行 `border-t`+`border-b` → 分组+稀疏分割线，或卡片替代 |
| 35 | **CTA 一个意图一个标签** | "联系我们"+"取得联系"+"开始项目" → 选一个 |

## 技术纪律 (#36-41)

| # | 规则 | 为什么 |
|---|------|--------|
| 36 | **z-index 必须用固定尺度** | 定义语义层（dropdown→sticky→modal→toast），禁止 `z-50`/`z-999` |
| 37 | **使用已有主题 token / 组件优先** | 不重复造轮子，引入新颜色前先查项目已有 token |
| 38 | **禁止 `window.addEventListener('scroll')`** | 用 Motion `useScroll()`/ScrollTrigger/IntersectionObserver/CSS scroll-driven |
| 39 | **`cn()` 工具合并 class**（`clsx`+`tailwind-merge`） | 避免样式冲突 |
| 40 | **中文页面必须有中文字体栈** | `"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif` |
| 41 | **Hero 必须有真实视觉元素** | 禁止纯文字+渐变背景做 Hero——用真实图片/生成图片/组件预览 |

## v3 新增：CSS 变量强制

代码生成时所有颜色必须通过 `var(--color-xxx)` 引用设计简报的 CSS 变量块。禁止硬编码 hex（如 `bg-[#F8FAFC]`、`text-[#1E293B]`）。禁止任意 Tailwind 颜色值（`text-[#123456]`、`p-[13px]`）。
