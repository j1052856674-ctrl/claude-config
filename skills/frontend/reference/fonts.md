# 字体数据库

> frontend v3 参考数据。SKILL.md Step 2 设计选配时按需加载。

## 8 组字体

| # | 标题(西文) | 标题(中文) | 正文(西文) | 正文(中文) | 代码 | 风格 |
|---|-----------|-----------|-----------|-----------|------|------|
| 1 | Sora | PingFang SC | Inter | PingFang SC | JetBrains Mono | 现代几何 |
| 2 | Playfair Display | Noto Serif SC | Lora | Noto Serif SC | Fira Code | 优雅衬线 |
| 3 | DM Sans | PingFang SC | DM Sans | PingFang SC | JetBrains Mono | 干净无衬线 |
| 4 | Space Grotesk | PingFang SC | Space Grotesk | PingFang SC | Fira Code | 科技几何 |
| 5 | Instrument Sans | PingFang SC | Instrument Serif | Noto Serif SC | JetBrains Mono | 混合衬线 |
| 6 | Satoshi | PingFang SC | Satoshi | PingFang SC | JetBrains Mono | 当代人文 |
| 7 | Syne | PingFang SC | Work Sans | PingFang SC | Fira Code | 大胆个性 |
| 8 | Inter | PingFang SC | Inter | PingFang SC | JetBrains Mono | 务实通用 |

## 字体纪律

- **Inter 字体原则**：Landing/Creative 场景非首选（AI 默认指纹），但不禁用。Dashboard/General 场景正常使用
- **衬线使用**：衬线体仅在编辑式/复古暖色风格中有明确理由时使用（Playfair Display #2 / Instrument Serif #5）
- **Fraunces 和 Instrument_Serif**：不作为默认衬线标题（LLM 最爱衬线 pair），仅在用户明确要求时使用
- **中文字体栈**：`"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`（所有场景强制）
- **字体数量上限**：全页 ≤3 个 font-family（display + body + optional mono）

## 场景推荐映射

### Dashboard 候选
优先：Inter(8) > DM Sans(3) > Space Grotesk(4) > JetBrains Mono（等宽数字）

### Landing 人格映射

| 人格 | 推荐标题字体 | 备选 |
|------|-----------|------|
| 极简克制 | Sora(1) | Space Grotesk(4) |
| 温暖手工 | Playfair Display(2) | Instrument Serif(5), Satoshi(6) |
| 科技前卫 | Space Grotesk(4) | Syne(7), DM Sans(3) |
| 经典专业 | DM Sans(3) | Satoshi(6) |
| 创意大胆 | Syne(7) | Playfair Display(2), Instrument Sans(5) |

### Creative 风格 → 默认字体

| 风格 | 默认标题(西+中) | 备选 |
|------|:--:|------|
| 极简白 | Sora + PingFang SC (#1) | DM Sans(3) |
| 粗野主义 | Space Grotesk + PingFang SC (#4) | Syne(7), JetBrains Mono |
| 编辑式 | Playfair Display + Noto Serif SC (#2) | Instrument Serif(5), DM Sans(3) |
| 暗色沉浸 | Space Grotesk + PingFang SC (#4) | Satoshi(6), Syne(7) |
| 复古暖色 | Satoshi + PingFang SC (#6) | Playfair Display(2), Instrument Sans(5) |
| 实验性 | Syne + PingFang SC (#7) | Space Grotesk(4), Playfair Display(2) |
