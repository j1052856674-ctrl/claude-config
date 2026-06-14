---
name: prototype-design
description: 前端原型设计skill。输入流程规划文档，输出可交互的HTML原型。当用户需要页面演示、交互确认时使用。
provides: [前端原型设计]
depends_on: []
---

# 前端原型设计 Skill

## 定位

流程规划确认后、PRD生成前的可选步骤。输入流程规划文档，输出可交互的HTML原型。

**核心价值**：让用户在浏览器中看到页面长什么样、怎么交互，确认后再写PRD，减少需求返工。

## 执行流程（5步）

### Step 1: 读取流程规划

输入：`output/[项目名]/flow-planning/[项目名]-flow-plan.md`

提取：
- 用户旅程步骤
- 页面列表
- 关键交互点

### Step 2: 设计系统确认

输出到 `output/[项目名]/design-system/MASTER.md`：

```markdown
# 设计系统 — [项目名]

## 配色方案
- 主色：
- 辅助色：
- 背景色：
- 文字色：

## 字体
- 标题：PingFang SC / 16px / bold
- 正文：PingFang SC / 14px / normal

## 间距
- 页面边距：24px
- 卡片间距：16px
- 按钮高度：40px
```

### Step 3: 生成原型HTML

输出到 `output/[项目名]/prototype/[项目名]-prototype.html`

**包含页面**：
- 首页/入口页
- 核心功能页
- 异常状态页（空状态/错误/加载中）

### Step 4: 交互式确认（可选）

启动本地服务：
```bash
python -m http.server 8080
```

用户在浏览器中：
- 浏览页面
- 点击交互
- 提出修改意见

### Step 5: 锁定原型

用户确认后，原型锁定，作为PRD的输入。

## 与 prd-flow-planning 的关系

```
用户确认流程规划
    ↓
调用 prototype-design
    ↓
产出原型HTML + 设计系统
    ↓
用户确认原型
    ↓
调用 prd-v3（以 流程规划 + 原型 为输入）
```

## 与 prd-v3 的关系

PRD-v3 的蓝图§B（前端Demo蓝图）直接引用原型设计输出：
- 页面清单 → 原型中的页面列表
- 组件清单 → 原型中的组件
- 交互规格 → 原型中的交互行为
