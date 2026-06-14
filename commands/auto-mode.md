---
description: 切换 Claude Code 权限级别（off/1/2/3），从日常确认到全自动零弹窗
---

根据 `$ARGUMENTS` 切换当前项目的权限级别。如果 `$ARGUMENTS` 为空，则查询当前模式状态。

## 四个级别

| 级别 | 名称 | 开放范围 | 仍需确认 | 适用场景 |
|---|---|---|---|---|
| off | 日常模式 | 仅用户原有白名单 | Bash、Agent 等大部分操作 | 正常交互探索 |
| 1 | 轻量自动 | 文件读写+搜索+Web | Bash、Agent、MCP | 明确任务，不需跑命令 |
| 2 | 半自动 | 轻量+常见安全 Bash | rm、push --force 等破坏性命令 | 大部分开发任务 |
| 3 | 全自动 | 一切工具 + Bash(*) | 无 | 批量自动化、流水线 |

## 步骤 1：判断目标级别

从 `$ARGUMENTS` 判断：

| 输入 | 级别 |
|---|---|
| off/关闭/恢复/日常/0/切回日常 | **off** |
| 1/轻量/light/轻量自动 | **1** |
| 2/半自动/semi/中等 | **2** |
| 3/全自动/full/on/开放权限/不要弹窗 | **3** |
| 空 | **查询当前模式**（不修改） |
| 不明确 | 询问："你想切换到哪个级别？off=日常 / 1=轻量 / 2=半自动 / 3=全自动" |

## 步骤 2：读取项目配置

读取当前项目根目录 `.claude/settings.local.json`。如果文件不存在，以 `{}` 为起点。

**必须保留配置中的所有其他字段**（如已有的非 permissions 内容），只增删 `permissions` 部分。

## 步骤 3：备份（首次使用）

检查 `.claude/settings-backup.json` 是否存在。如果不存在，将当前 settings.local.json 的完整内容写入备份。备份一旦创建不再覆盖。

## 步骤 4：写入目标级别

### 级别 off：合并恢复

1. 读取 `.claude/settings-backup.json` 获取原始 permissions
2. 读取当前 `settings.local.json` 获取当前 permissions
3. 从当前 permissions 中**过滤掉所有 auto-mode 模板条目**（下面各级别 allow 列表中出现的所有条目）
4. 过滤后剩余 = 用户在自动模式期间手动添加的权限
5. **合并**：原始 permissions + 用户手动添加权限（去重）
6. 写入合并后的 settings.local.json
7. 不删除备份

如果备份不存在：移除 permissions 字段。

### 级别 1：轻量自动

```json
"permissions": {
  "allow": [
    "Read",
    "Glob",
    "Grep",
    "Edit",
    "Write",
    "WebFetch",
    "WebSearch",
    "NotebookEdit"
  ]
}
```

### 级别 2：半自动

```json
"permissions": {
  "allow": [
    "Read",
    "Glob",
    "Grep",
    "Edit",
    "Write",
    "WebFetch",
    "WebSearch",
    "NotebookEdit",
    "Agent",
    "Bash(git *)",
    "Bash(ls *)",
    "Bash(dir *)",
    "Bash(find *)",
    "Bash(mkdir *)",
    "Bash(cp *)",
    "Bash(mv *)",
    "Bash(cat *)",
    "Bash(bat *)",
    "Bash(less *)",
    "Bash(more *)",
    "Bash(head *)",
    "Bash(tail *)",
    "Bash(grep *)",
    "Bash(sort *)",
    "Bash(wc *)",
    "Bash(jq *)",
    "Bash(which *)",
    "Bash(where *)",
    "Bash(pwd *)",
    "Bash(echo *)",
    "Bash(diff *)",
    "Bash(tee *)",
    "Bash(type *)",
    "Bash(stat *)",
    "Bash(basename *)",
    "Bash(dirname *)",
    "Bash(realpath *)",
    "Bash(cygpath *)",
    "Bash(cut *)",
    "Bash(tr *)",
    "Bash(tar *)",
    "Bash(unzip *)",
    "Bash(zip *)",
    "Bash(python *)",
    "Bash(pip *)",
    "Bash(npm *)",
    "Bash(npx *)",
    "Bash(node *)",
    "Bash(curl *)",
    "Bash(gh *)",
    "Bash(claude *)",
    "Bash(codex *)",
    "Bash(docker *)",
    "Bash(chmod *)",
    "Bash(make *)",
    "Bash(cargo *)",
    "Bash(go *)",
    "Bash(gradle *)",
    "Bash(tasklist *)",
    "Bash(ps *)",
    "Bash(hostname *)",
    "Bash(uname *)",
    "Bash(systeminfo *)",
    "Bash(sha256sum *)",
    "Bash(md5sum *)",
    "Bash(winget *)",
    "Bash(powershell *)",
    "Bash(dotnet *)"
  ]
}
```

### 级别 3：全自动

```json
"permissions": {
  "allow": [
    "Bash(*)",
    "Edit",
    "Write",
    "Read",
    "Glob",
    "Grep",
    "WebFetch",
    "WebSearch",
    "NotebookEdit",
    "Agent",
    "MCP(*)"
  ]
}
```

## 步骤 5：通知用户

```
已切换到 **[级别名称]** 模式

[级别说明]

建议退出当前会话并重新启动 Claude Code，使权限配置完全生效。
切换到其他级别：/auto-mode [off|1|2|3]
查看当前模式：/auto-mode
```

说明文案：
- **off**："已恢复日常模式。操作恢复确认弹窗，保留你最初的白名单 + 自动模式期间手动添加的权限。"
- **1**："轻量自动模式。文件读写、搜索、Web 请求已免确认；Bash 命令、Agent、MCP 仍需确认。"
- **2**："半自动模式。文件操作 + 常见安全命令已免确认；破坏性命令（rm、push --force）仍需确认。"
- **3**："全自动模式。所有工具权限已开放，零弹窗。请谨慎使用，任务完成后及时切回。"

## 状态查询（$ARGUMENTS 为空时）

不修改任何文件，只读取并报告：

1. 读取 `.claude/settings.local.json`
2. 检测当前级别（按优先级）：
   - 包含 `Bash(*)` → 级别 3（全自动）
   - 包含 `Agent` 且不含 `Bash(*)` → 级别 2（半自动）
   - 包含 `NotebookEdit` 且不含 `Agent` 且不含任何 Bash → 级别 1（轻量自动）
   - 其他 → 日常模式 (off)
3. 输出当前模式名称 + 级别说明 + 四个切换命令

## 安全提醒

级别 3 风险：rm、push --force 等不再有确认拦截。仅在批量任务场景下开启，完成后立即切回。

## 异常处理

- 读取失败：说明原因，建议检查文件权限
- 写入失败：输出需修改的 JSON 供用户手动粘贴
- 备份损坏：移除 permissions 字段作为降级方案
- 合并恢复时重复条目：去重处理