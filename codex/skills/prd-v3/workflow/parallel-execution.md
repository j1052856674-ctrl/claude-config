### Workflow 并行执行机制（🚨 强制）

> **所有可以并行的步骤必须使用 Workflow pipeline 并行执行，减少等待时间。**

**可并行的任务矩阵**：

| 步骤 | 可并行任务 | 并行方式 | 预计提速 |
|------|-----------|---------|---------|
| Step 3+4: PRD内容生成 | §1-§7各章节内容增强 | `pipeline(章节列表, 逐章增强)` | 3-5x |
| Step 3.5: 蓝图生成 | §0共享定义 + §A3图定义 + §B3页规格 | `pipeline(3个蓝图区块, 逐块生成)` | 3x |
| Step 6: HTML生成 | §1-§7内容注入HTML骨架 | `pipeline(章节列表, 逐章注入)` | 3-5x |
| Step 6: drawio生成 | §A1架构图 + §A2流程图 + §A3泳道图，各自独立 | `parallel([架构图agent, 流程图agent, 泳道图agent])` | 3x |
| Step 6: 评分检查 | 条目检查 + 量化评分 | `parallel([条目检查, 量化评分])` | 2x |

**执行模板**（每次生成 PRD 时参照）：

```javascript
// Step 3+4: PRD内容增强（pipeline逐章并行）
export const meta = {
  name: 'prd-content-enhance',
  phases: [{ title: 'Enhance', detail: '逐章节增强PRD内容' }]
}
const chapters = ['§1背景', '§2需求', '§3交互', '§4接口', '§5埋点', '§6非功能', '§7变更', '字段模板']
const results = await pipeline(
  chapters,
  chapter => agent(`增强${chapter}内容，引用对应子模板补全缺失项`, {label: `enhance:${chapter}`, phase: 'Enhance'})
)

// Step 6: 多产出物并行生成
export const meta = {
  name: 'prd-deliverables',
  phases: [{ title: 'Generate', detail: '并行生成HTML/drawio/评分' }]
}
const [htmlResult, scoringResult] = await parallel([
  () => agent('生成PRD HTML文件，遵循阿里云简约风格+可编辑+Mermaid安全语法', {label: 'html-gen', phase: 'Generate'}),
  () => agent('执行质量评分，条目检查+量化评分双轨', {label: 'scoring', phase: 'Generate'})
])
```

**强制规则**：
1. 凡是多个章节/多图/多文件可独立处理的工作，**必须用 pipeline 或 parallel 并行**
2. 凡是有先后依赖关系的（如蓝图→drawio），用 pipeline 顺序执行
3. 凡是无依赖关系的（如HTML生成和评分），用 parallel 并行执行
4. HTML生成环节优先用 pipeline 拆成章节注入，避免单 agent 逐行生成整文件
5. Mermaid 语法自检必须在 HTML 写入后立即执行，不能等用户发现报错