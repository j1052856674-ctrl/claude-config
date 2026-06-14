# OpenPencil 可选产出规范

> 本文件定义蓝图 §B 数据映射到 OpenPencil PenNode JSON 的规则，以及分层设计流程、代码导出规范。OpenPencil 是 PRD Skill Step 6e 的**可选补充**，仅在用户需要设计稿时执行。

## 1. 分层设计工作流

```
op design:skeleton '<json>'      → 创建页面骨架（section frames + roles）
op design:content <id> '<json>'  → 逐 section 填充内容节点
op design:refine --root-id <id> → 验证 + 自动修复（resolve icon paths + fix layout）
```

### 执行顺序
1. **skeleton**：为每个页面创建 section 结构框架
2. **content**：为每个 section 填充组件节点
3. **refine**：验证并修复（必须执行，否则 icon_font 不会 resolve）

## 2. 蓝图 §B → PenNode 映射表

### 2.1 页面 → Page

| 蓝图字段 | PenNode 属性 | 示例 |
|---------|-------------|------|
| 页面名称 (B1.1) | `op page add --name "页面名称"` | P01 → page "一键查询页" |
| 页面类型 | page frame role | `role: "section"` + `layout: "vertical"` |
| 路由路径 | metadata | 不映射到 PenNode，记录到 metadata |
| 核心功能 | description | 页面描述文本 |

### 2.2 布局区域 → Section Frame

| 蓝图字段 | PenNode 属性 | 示例 |
|---------|-------------|------|
| 区域名称 | name | `name: "查询区域"` |
| 占比 | width / height | `width: "40%"` 或 `width: "fill_container"` |
| 排列 | layout | 左侧/右侧/顶部/底部/居中 → `layout: "vertical"` / `layout: "horizontal"` |
| 描述 | 不映射 | 辅助AI理解，不写入PenNode |

### 2.3 组件清单 → PenNode 内容节点

| 蓝图组件类型 | PenNode type + role | 默认属性 |
|-------------|--------------------|---------|
| Button | `frame` + `role: "button"` | `layout: "horizontal"`, `padding: [12,24]`, `cornerRadius: 8`, `fill: solid $primary` |
| TextInput | `frame` + `role: "form-input"` | 子节点包含 label + input text |
| TextArea | `frame` + `role: "form-input"` | 同上，高度自适应 |
| ScrollList | `frame` + `role: "column"` | 子节点重复，每项间距 12px |
| InfoCard | `frame` + `role: "card"` | `cornerRadius: 12`, `padding: 24`, `fill: solid #FFFFFF` |
| ScoreDisplay | `frame` + `role: "stat-card"` | 数值 24px 粗体 + 环形/条形进度 |
| ButtonGroup | `frame` + `role: "row"` | 子节点为多个 button role，间距 8px |
| StatusTag | `frame` + `role: "tag"` / `role: "pill"` | `cornerRadius: 4`（tag）/ `cornerRadius: 999`（pill） |
| Dialog | `frame` + `role: "centered-content"` + `card` | 居中遮罩 + 白底卡片 |
| Toast | `frame` + `role: "centered-content"` | 底部浮动，自动 dismiss（CSS动画） |
| NavBar | `frame` + `role: "navbar"` | `layout: "horizontal"`, `height: 56-72`, `padding: [0,24]`, `justifyContent: "space_between"` |
| FormSection | `frame` + `role: "card"` + `role: "form-group"` | 白底卡片内嵌表单 |
| Select | `frame` + `role: "form-input"` | 带下拉箭头 icon |
| DatePicker | `frame` + `role: "form-input"` | 带日历 icon |
| Tabs | `frame` + `role: "nav-links"` | 子节点为 `nav-link` |
| Table | `frame` + `role: "table"` | 子节点为 `table-row` + `table-header` + `table-cell` |
| Chart | `frame` + `role: "screenshot-frame"` | 图表展示区 |
| EmptyState | `frame` + `role: "centered-content"` | 子节点：icon_font + text(role: "body-text") |
| Loading | `frame` + `role: "centered-content"` | 居中旋转动画（CSS）或骨架屏 |

### 2.4 Icon → icon_font 节点

```json
{
  "type": "icon_font",
  "iconFontName": "send",
  "size": 24,
  "fill": [{"type": "solid", "color": "$textSecondary"}]
}
```

- icon 名称使用 Lucide 命名（小写 kebab-case）
- 按钮内 icon: 24px，卡片标题: 20px，标签: 16px
- **必须使用 `icon_font`**，不要用 `path`（MCP 中 path 类型无法 resolve）

### 2.5 配色方案 → Design Variables

```bash
# 主色调
op vars:set '{ "$primaryColor": "#1890ff", "$successColor": "#52c41a", "$errorColor": "#f5222d" }'

# 文字色
op vars:set '{ "$textPrimary": "#1e293b", "$textSecondary": "#64748b", "$textMuted": "#9CA3AF" }'

# 背景色
op vars:set '{ "$bgPrimary": "#ffffff", "$bgSurface": "#f8fafc", "$bgBorder": "#e2e8f0" }'
```

### 2.6 间距网格 → Design Variables

```bash
op vars:set '{ "$pagePadding": 24, "$areaSpacing": 16, "$componentSpacing": 12, "$cardPadding": 16, "$buttonGroupSpacing": 8 }'
```

## 3. 布局引擎规则

### 3.1 四条硬规则

1. **子元素不设置 x/y**：在 layout 容器中，引擎自动定位
2. **兄弟元素使用相同 width 策略**：全 `fill_container` 或全固定
3. **禁止 `fill_container` 嵌套在 `fit_content` 内**：会导致循环依赖
4. **水平卡片行中所有卡片使用 `width: "fill_container"`, `height: "fill_container"`**

### 3.2 Auto-layout 配置

| 场景 | layout | gap | padding | justifyContent | alignItems |
|------|--------|-----|---------|---------------|-----------|
| 页面主体 | vertical | 16 | 24 | - | - |
| 水平导航 | horizontal | 8 | [0,24] | space_between | center |
| 按钮组 | horizontal | 8 | - | - | center |
| 卡片内部 | vertical | 12 | 24 | - | - |
| 表单项 | vertical | 8 | - | - | stretch |
| 数据表格 | vertical | 0 | - | - | stretch |

## 4. 代码导出规范

### 4.1 导出命令

```bash
# Step 1: 声明框架和根节点
op codegen:plan '{"framework":"react","rootNodeIds":["page-id"],"options":{"tailwind":true}}'

# Step 2: 逐节点提交代码
op codegen:submit '{"nodeId":"...","code":"...","imports":["..."]}'

# Step 3: 组装
op codegen:assemble --framework react

# Step 4: 清理
op codegen:clean
```

### 4.2 支持的框架

| 框架 | 命令 | 适用场景 |
|------|------|---------|
| React + Tailwind | `codegen:plan --framework react --options tailwind=true` | Step 6b 前端原型 |
| HTML + CSS | `codegen:plan --framework html` | 简单 Demo |
| Vue | `codegen:plan --framework vue` | Vue项目 |
| Svelte | `codegen:plan --framework svelte` | Svelte项目 |
| Flutter | `codegen:plan --framework flutter` | 移动端 |

## 5. 与 Superpowers 链路对接规则

### 5.1 数据流方向

```
ui-ux-pro-max --design-system --persist
    ↓ 产出 MASTER.md
frontend skill → 读取 MASTER.md + 蓝图§B → prototype.html
    ↓ 已确认原型
OpenPencil → 提取视觉参数 → .op 设计文件
    ↓ 代码导出
codegen → React/HTML/Vue/Svelte/Flutter
```

### 5.2 变量映射脚本

推荐编写 `scripts/op_vars_to_design_system.py`：
- 输入：`op vars` 命令输出（JSON）
- 输出：ui-ux-pro-max 可读的设计系统参数 JSON
- 作用：确保 OpenPencil 设计稿和 superpowers 代码产出视觉一致

### 5.3 一致性检查点

| 检查项 | OpenPencil | Superpowers | 验证方式 |
|--------|-----------|-------------|---------|
| 主色调 | `$primaryColor` | `--color-primary` / `bg-primary` | 视觉对比 |
| 字体栈 | `fontFamily` | `--font-sans` / `font-family` | 视觉对比 |
| 间距 | `$pagePadding` / `$areaSpacing` | `p-6` / `gap-4` | 视觉对比 |
| 圆角 | `cornerRadius` | `rounded-*` | 视觉对比 |
| icon | `iconFontName` (Lucide) | `lucide-react` / SVG | 名称一致性 |

## 6. 质量检查清单

生成 OpenPencil 设计稿后必须执行：

- [ ] `op design:refine --root-id <id>` → 确认无错误
- [ ] icon 名称全部使用 `icon_font`（非 path）
- [ ] layout 容器内子元素不设置 x/y
- [ ] 配色变量与 MASTER.md 一致
- [ ] 导出 PNG 预览 → 确认视觉效果
- [ ] （可选）`op codegen:assemble` → 确认代码可正常渲染
