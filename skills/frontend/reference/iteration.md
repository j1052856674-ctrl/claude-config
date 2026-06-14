# 迭代纪律

> frontend v3 参考数据。SKILL.md Step 5 迭代时按需加载。

## 迭代核心纪律

| # | 规则 | 为什么 |
|---|------|--------|
| I1 | **只改用户明确要求的元素** | 用户说"改字体"→ 只换字体引用 + font-family，不碰布局/色板/结构 |
| I2 | **局部编辑优先，禁止全文重写** | 用 Edit 工具做精准替换，非用户要求对整体设计不满意时禁止 Write 全量覆盖 |
| I3 | **改前确认改动范围** | "改了 X，不会动 Y 和 Z"——让用户知道哪些东西保持原样 |
| I4 | **保留已确认的设计锚点** | 上一轮用户认可的视觉元素（统计卡片、CTA 按钮、Section 布局）视为已锁定，迭代中不主动改动 |
| I5 | **违反内容纪律的默认值立即修正** | em-dash、滚动提示、Section 编号、装饰圆点——生成时违反属于自检失败 |
| I6 | **涉及多 Section 重设计时先生成独立预览** | 生成 `section-preview.html` 只包含待改 Section，隔离迭代、反复刷新确认；通过后再合入 index.html |

## 迭代反模式（发生过，严禁重复）

| 反模式 | 案例 | 正确做法 |
|--------|------|---------|
| 修小改大 | 用户要"去 nav + 调内容结构"，AI 连 Hero CTA 按钮 + 内容宽度 + 动效全改了 | 明确改动边界：只改 nav + Section 顺序，其余保持原样 |
| 全文重写 | 每次微调用 Write 全量覆盖 index.html | 用 Edit 做精准替换；只有用户对整体不满意时才全文重写 |
| 静默退化 | 重写时丢失了统计卡片、渐变色标题、CTA 按钮等已确认的视觉锚点 | 重写前盘点上一版的视觉锚点清单，写入新版本时逐项核对 |
| 全页迭代局部问题 | 用户对 2 个 Section 不满意，AI 重写整页 → Hero/About/Contact 被意外改动 | 生成 section-preview.html 隔离迭代 → 用户确认 → Edit 精准替换目标 Section |

## Section 预览隔离操作步骤

```
1. 用户反馈："XX Section 和 YY Section 不太对"
2. AI 生成 section-preview.html（仅含目标 Section，复用 index.html 的 CSS 变量块）
3. 用户刷新 http://localhost:3333/section-preview.html
4. 反复修改 section-preview.html → 用户确认
5. AI 用 Edit 工具将确认后的 Section HTML 精准替换到 index.html
6. 删除 section-preview.html（或保留供后续参考）
```

## 迭代上限

- 同问题连续修复 ≤3 次。超过则暂停，说明当前判断、已尝试方案和建议下一步
- 用户连续换色板/字体 3 次仍不满意 → 建议重选风格（Creative 回到 2.4.1，其他场景回到 Step 2 picker）
- 全局迭代轮次建议 ≤10 轮，超过建议接受当前或人工介入
