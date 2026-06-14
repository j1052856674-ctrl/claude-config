# 自检报告清单

> frontend v3 参考数据。SKILL.md Step 4.5 硬门禁自检时按需加载。

## 功能完整性
- [ ] 所有按钮有 handler / `type="submit"`
- [ ] 所有 Modal 三态关闭（X + Esc + 遮罩）
- [ ] 所有表单三态完整（loading + error + success）
- [ ] 所有 Dropdown 双向切换 + 键盘操作
- [ ] 数据区域有 loading / empty / error 状态
- [ ] 空状态有明确下一步操作（非仅"暂无数据"）

## 视觉纪律
- [ ] 无紫色渐变 / 无纯灰 / 无 glow / 无 bounce / 无卡片嵌套
- [ ] 无三列等大功能卡片 / 无 Section 布局重复 / 无 Split-Header
- [ ] Eyebrow 数 ≤ ceil(section数/3)
- [ ] 所有颜色来自设计简报 CSS 变量（禁止硬编码 hex）
- [ ] 圆角统一 / 色彩一致性锁定 / 单强调色
- [ ] 标题 `text-wrap: balance`，正文 `text-wrap: pretty`
- [ ] 无纯 `#000` / 纯 `#fff`
- [ ] 无 em-dash / 无版本标签 / 无滚动提示 / 无 Section 编号 / 无装饰圆点
- [ ] Hero 有真实视觉元素（非纯文字+渐变背景）
- [ ] CSS 变量块完整，所有 `var(--xxx)` 引用有效

## 响应式
- [ ] 375px 不掉落 / 768px 合理 / 1024px 正常 / 1440px 不满屏空白
- [ ] 触摸目标 ≥ 44px
- [ ] `<meta name="viewport">` 存在
- [ ] 无 `h-screen`（已用 `dvh`），固定元素有 `safe-area-inset`

## 无障碍
- [ ] 图片有 alt / icon按钮有 aria-label / 输入框有 label
- [ ] 按钮文字与背景满足 WCAG AA 对比度（4.5:1）
- [ ] prefers-reduced-motion 已实现
- [ ] 数据表格使用 `font-variant-numeric: tabular-nums`

## 代码正确性
- [ ] 所有引用的 CSS 变量/类/组件已定义
- [ ] 所有 import 路径有效
- [ ] 无明显的 JS 语法/逻辑错误
- [ ] z-index 使用固定语义层（非任意值）
- [ ] 无 `window.addEventListener('scroll')` / 无 `useEffect` 做渲染逻辑
- [ ] 方形元素用 `size-*`

## 交互完整性
- [ ] 破坏性操作有 AlertDialog
- [ ] 输入框不禁用粘贴
- [ ] 交互反馈 ≤200ms
- [ ] 循环动画离屏时暂停
- [ ] 不在非动画元素上设 `will-change`
- [ ] 可点击元素有 cursor-pointer + hover 反馈

## 特殊元素渲染正确性 ← v3.1 新增：验证"渲染出来对不对"

> 下列元素缺失某个 CSS 属性就会渲染完全错误，不是主观品味问题，是硬性基础设施。

- [ ] **File tree / ASCII art**：容器有 `white-space: pre`，或使用 `<pre>` 标签（非 `<div>`+`<span>` 手动构建时必查）
- [ ] **代码块**：monospace 字体已加载（Google Fonts link 存在），无中文字体回退导致的错位
- [ ] **Flow 流程图**：箭头在 mobile 断点下正确变为竖向（`transform: rotate(90deg)`）或隐藏，不出现横向截断
- [ ] **数据表格**：小屏有 `overflow-x: auto` 包裹，不出现横向溢出遮挡
- [ ] **JSON/代码预览块**：内容没有因为缺少 `white-space: pre-wrap` 或类似属性而单行溢出

## Landing 专属（如适用）
- [ ] Hero 适配首屏 / top-padding ≤ pt-24 / ≤4 文字元素
- [ ] CTA ≤3词不换行 / 无重复意图 CTA
- [ ] Logo墙在 Hero 下 / 只用 Logo
- [ ] Zigzag ≤2 连续 / 至少 4 种布局类型

## 自检纪律

- 逐项 ✅/❌，所有 ❌ 修复后重新打勾
- 最多 3 轮修复，超过标注"已知限制"
- impeccable CLI 结果并入报告（warning 逐条判定）
- 全部 ✅ 后才能告知用户"页面已完成"
