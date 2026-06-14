---
name: auto-mode
description: 切换 Claude Code 权限模式，提供 4 个级别从日常确认到全自动零弹窗。当用户说"开启自动模式"、"全自动"、"开放权限"、"不要弹窗了"、"切到自动"、"轻量自动"、"半自动"、"让我全自动跑"、"太烦了每次都要点"、"我不想点确认了"时触发此 Skill 切换到对应级别。当用户说"关闭自动模式"、"收回权限"、"恢复日常模式"、"切回日常"、"关闭全自动"时触发恢复日常模式。即使只是抱怨弹窗太多而没有明确说要切换，也应该考虑使用此 Skill。也适用于用户询问"当前是什么模式"、"权限级别"、"auto-mode"等状态查询场景。
---

# auto-mode：Claude Code 权限模式切换

提供 4 个权限级别，从最保守到最开放，用户可根据场景灵活选择：

| 级别 | 名称 | 免确认的具体范围 | **仍需确认**的破坏性操作 | 适用场景 |
|---|---|---|---|---|
| **off** | 日常模式 | 仅用户原有白名单 | Bash、Agent 等大部分操作 | 正常交互探索 |
| **1** | 轻量自动 | Read/Write/Edit/Glob/Grep/WebFetch/WebSearch/NotebookEdit（纯文件与搜索工具，无任何 Bash） | 全部 Bash、Agent、MCP | 执行明确任务，不需跑命令 |
| **2** | 半自动 | 级别1全部 + Agent + 60+常见Bash（git/ls/cp/mv/python/npm/docker/gh 等，详见 `references/levels.json`） | **rm/rmdir/del/erase**（删文件目录）<br>**git push --force/reset --hard**（覆盖历史）<br>**mklink/reg**（改系统配置）<br>**taskkill**（杀进程）<br>**format/diskpart**（磁盘操作）<br>其他未白名单的任意Bash | 大部分开发任务 |
| **3** | 全自动 | 一切工具 + Bash(*)（含上述所有破坏性命令） | **无任何拦截** | 批量自动化、流水线 |

## 步骤 1：判断目标级别

从用户输入或 `$ARGUMENTS` 判断目标级别（`$ARGUMENTS` 为空格分隔的字符串，取第一个词作为级别标识）：

| 用户说法 | 级别 |
|---|---|
| "关闭"、"恢复"、"收回权限"、"日常"、"off"、"0"、"切回日常" | **off** |
| "轻量"、"轻量自动"、"light"、"1" | **1** |
| "半自动"、"semi"、"2"、"中等" | **2** |
| "全自动"、"开放权限"、"不要弹窗"、"full"、"on"、"3"、"切到自动" | **level 3** |
| 无明确级别 | 询问用户并展示级别表："你想切换到哪个级别？" |
| 只问"当前模式" | 执行状态查询（步骤 5） |

## 步骤 2：定位并读取项目配置

本 Skill 修改**项目级配置** `.claude/settings.local.json`，仅影响当前项目。

项目配置路径：当前项目根目录下的 `.claude/settings.local.json`

**重要**：配置文件可能包含除 `permissions` 和 `_autoMode` 外的其他字段。修改时必须保留所有现有内容，仅增删 `permissions` 和 `_autoMode` 部分。

## 步骤 3：执行切换

### 通用流程

1. **幂等性检查**：读取当前 `.claude/settings.local.json`
   - 如果文件不存在：以 `{}` 为起点
   - 检查 `_autoMode.level` 是否已等于目标级别
   - 如已匹配 → 通知"已在 [级别名称] 模式，无需切换" → 结束

2. **读取当前配置完整内容**
   - 使用 Read 工具读取项目根目录 `.claude/settings.local.json`
   - 如果 JSON 解析失败 → 报告错误"settings.local.json 格式损坏，无法自动切换。请手动检查文件。" → 结束

3. **首次使用时备份原始配置**
   - 检查是否存在 `.claude/settings-backup.json`
   - 如果备份不存在：将当前 `permissions` 内容 + 元数据写入备份

   ```json
   {
     "_backupMeta": {
       "created": "2026-06-11T15:30:00+08:00",
       "autoModeVersion": "2.0",
       "originalLevel": "off"
     },
     "permissions": { ... }
   }
   ```

   - 备份一旦创建就不再覆盖（保留用户最初状态）
   - 如果备份存在但 JSON 解析失败 → 视为损坏，重新创建备份（覆盖损坏文件）

4. **根据目标级别修改 permissions 字段**
   - 各级别的完整 `permissions.allow` 列表见 `references/levels.json`（**唯一数据权威源**）
   - 在保留所有其他顶层字段的基础上，新增或替换 `permissions` 和 `_autoMode`
   - 写入 `_autoMode: {"level": "<目标级别>", "switchedAt": "<当前ISO时间>", "version": "2.0"}`
   - 使用 Write 工具写入修改后的完整 JSON
   - **写入后验证**：Read 回文件，确认 `permissions.allow` 已为目标级别的值

5. **写入失败处理**
   - Write 失败 → 说明原因，输出需修改的 JSON 供用户手动粘贴

### 各级别权限配置

#### 级别 off：日常模式（diff 恢复，v2 算法）

恢复到用户原始白名单，但保留用户在自动模式期间手动添加的自定义权限：

```
算法: restore_to_off()

1. 读取 .claude/settings-backup.json
   - 备份不存在 → 移除 permissions 和 _autoMode 字段 → 写入 → 通知"无备份文件，已恢复 CC 默认权限" → 结束
   - JSON 解析失败 → 报告"备份文件损坏" → 移除 permissions 和 _autoMode 字段（降级）→ 通知 → 结束

2. 读取当前 settings.local.json

3. 构造 TEMPLATE_ALL = references/levels.json 中 L1+L2+L3 所有 allow 条目的并集（去重）

4. 计算三向 diff：
   backup_allow = backup.permissions.allow（用户首次切换前的原始白名单）
   current_allow = current.permissions.allow（当前权限）
   new_entries = current_allow 中有而 backup_allow 中没有的条目
   auto_mode_additions = new_entries 中存在于 TEMPLATE_ALL 中的条目
   user_additions = new_entries - auto_mode_additions
   final_allow = backup_allow + user_additions（去重，backup 条目优先）

5. 写入最终配置:
   - permissions.allow = final_allow
   - 移除 _autoMode 字段（如有）

6. 通知用户：
   - "已恢复日常模式 ✅"
   - 如 user_additions 非空："保留了你在自动模式期间手动添加的 N 条自定义权限"
   - 如 auto_mode_additions 非空："已移除 auto-mode 自动添加的 M 条权限"
```

**v2 关键改进**：`backup_allow` 中已有的条目**永不删除**（即使与 TEMPLATE_ALL 重合）。这解决了 v1 中"用户原始白名单含 `Bash(git *)` 等常见权限时被误认为模板条目而静默丢失"的 P0 bug。

#### 级别 1：轻量自动

`permissions.allow` 内容详见 `references/levels.json` 级别 1。

自动批准文件读写、搜索、Web 请求。Bash 命令、Agent、MCP 仍需确认。

#### 级别 2：半自动

`permissions.allow` 内容详见 `references/levels.json` 级别 2。

自动批准所有非 Bash 工具 + 60+常见安全 Bash 命令。

**⚠️ Windows 用户注意**：L2 包含 `Bash(powershell *)`，PowerShell 可以执行等效于以下破坏性操作：
- `Remove-Item -Recurse -Force`（等效 rm -rf）
- `Stop-Process -Force`（等效 taskkill）
- `Set-ItemProperty`（等效 reg 修改注册表）

如果你需要严格的删除/进程保护，请使用 **L1** 并手动添加安全的 PowerShell 命令子集（如 `Bash(powershell -Command Get-*)`）。

**v2 变更**：已移除 v1 中的 `Bash(claude *)` 和 `Bash(codex *)`。这两个是 LLM 代理入口，可通过嵌套调用 Claude/Codex 实例绕过破坏性命令拦截，安全边界等价于 `Bash(*)`。如你确实需要这些命令，请手动添加到自定义权限列表或使用 L3。

**以下破坏性 Bash 命令不在 L2 白名单中，仍需确认**：

| 类别 | 具体命令 | 危害 |
|---|---|---|
| 删除文件/目录 | rm、rmdir、del、erase | 不可逆删除，可能误删关键文件 |
| 覆盖 Git 历史 | git push --force、git push -f、git reset --hard、git clean -f | 丢失提交、覆盖远程分支 |
| 杀进程 | taskkill、kill | 终止运行中的程序 |
| 改系统配置 | mklink、reg、regedit | 修改系统注册表/符号链接 |
| 磁盘操作 | format、diskpart | 格式化磁盘 |
| 任意未白名单命令 | 其他所有不在列表中的 Bash | 不可预判风险 |

#### 级别 3：全自动

`permissions.allow` 内容详见 `references/levels.json` 级别 3。

一切权限开放，零弹窗。**意味着以下破坏性操作也不再有任何确认拦截**：rm/del/rmdir（删除文件目录）、git push --force（覆盖远程历史）、taskkill（杀进程）、mklink/reg（改系统配置）、format/diskpart（磁盘操作），以及任意 Bash 命令。

> ⚠️ **切换前确认**：你即将开放所有权限，包括文件删除、历史覆盖、进程终止等破坏性操作。确认继续？

### 步骤 4：切换完成通知

根据切换到的级别，用以下格式通知用户：

```
已切换到 **[级别名称]** 模式 ✅（权限已即时生效，无需重启）

[级别说明，简述开放了什么、仍需确认什么]

切换到其他级别：/auto-mode [off|1|2|3]
查看当前模式：/auto-mode
```

各级别切换通知文案（必须包含开放范围和仍拦截的破坏性操作）：

- **off**："已恢复日常模式。操作恢复确认弹窗，保留你最初的白名单 + 自动模式期间手动添加的权限。"
- **1**："轻量自动模式。免确认：Read/Write/Edit/Glob/Grep/WebFetch/WebSearch/NotebookEdit（纯文件与搜索工具，无任何 Bash 命令）。仍需确认：全部 Bash、Agent、MCP。"
- **2**："半自动模式。免确认：级别1全部 + Agent + 60+常见Bash（git/ls/cp/mv/find/python/npm/node/pip/curl/gh/docker/tar 等）。**仍需确认的破坏性操作**：rm/rmdir/del（删文件目录）、git push --force/reset --hard（覆盖历史）、taskkill（杀进程）、mklink/reg（改系统配置）、format/diskpart（磁盘操作）及其他未白名单Bash。⚠️ Windows 用户：Bash(powershell *) 已自动批准，PowerShell 可执行等效破坏性操作（Remove-Item/Stop-Process/Set-ItemProperty），如需严格文件保护请使用 L1。"
- **3**："全自动模式。所有工具 + Bash(*) 已开放，**不再有任何确认弹窗**，包括 rm、del、push --force、taskkill 等破坏性命令。请谨慎使用，任务完成后及时切回较低级别。"

## 步骤 5：当前状态查询

如果用户只输入 `/auto-mode` 不带参数，或问"当前是什么模式"：

1. 读取项目根目录 `.claude/settings.local.json`
2. 检查 `_autoMode.level` 字段判断当前级别（v2 主路径）：
   - 字段存在 → 直接读取级别
   - 字段不存在 → fallback 到 v1 启发式检测（向下兼容）：
     - 包含 `Bash(*)` → **级别 3（全自动）**
     - 包含 `Agent` 且不含 `Bash(*)` → **级别 2（半自动）**
     - 包含 `NotebookEdit` 且不含 `Agent` 且不含任何 `Bash(...)` 模式 → **级别 1（轻量自动）**
     - 其他情况 → **日常模式 (off)**
3. 如 fallback 检测结果可能不准确（存在自定义白名单），提示"检测到你可能在 v1 格式下运行，执行一次切换即可升级到 v2 显式状态记录"
4. 输出格式：

```
当前模式：**[级别名称]**
状态来源：[v2 显式记录 | v1 启发式推断]
切换时间：[时间 或 "未知（v1 格式）"]

切换命令：
  /auto-mode off  — 日常模式（恢复确认弹窗）
  /auto-mode 1    — 轻量自动（文件+搜索免确认）
  /auto-mode 2    — 半自动（+常见命令免确认）
  /auto-mode 3    — 全自动（零弹窗）
```

## 安全提醒

各级别的风险等级：

| 级别 | 风险 | 具体危险操作 | 建议 |
|---|---|---|---|
| off | 最低 | 无（全部需确认） | 日常使用首选 |
| 1 | 低 | Write/Edit 可误写文件，但 Bash 全部拦截 | 执行明确文件任务 |
| 2 | 中 | Write/Edit 可误写文件；60+命令免确认但 **rm/del/push --force/taskkill 等破坏性命令仍拦截**。⚠️ `Bash(powershell *)` 可执行等效破坏性操作 | 大部分开发任务 |
| 3 | **高** | **rm/del/push --force/taskkill/format 等破坏性命令全部免确认**，可误删文件、覆盖历史、杀进程 | 仅批量自动化 |

级别 3 使用建议：
- 仅在批量任务、自动化流水线场景下开启
- 任务完成后立即切回较低级别
- 不要长时间无人值守运行

## 异常处理

| 异常情况 | 处理方式 |
|---|---|
| settings.local.json 不存在 | 以 `{}` 为起点，后续写入时自动创建 |
| settings.local.json JSON 解析失败 | 报告错误"格式损坏，请手动检查文件"，不做任何写入 |
| Write 写入失败 | 说明原因，输出需修改的 JSON 供用户手动粘贴 |
| 备份文件不存在（恢复时） | 移除 permissions 和 _autoMode 字段，恢复到 CC 默认行为 |
| 备份文件 JSON 解析失败 | 报告"备份文件损坏"，移除 permissions 和 _autoMode 字段（降级方案），同时删除损坏的备份文件 |
| 备份文件无 `_backupMeta`（v1 旧备份） | 正常使用，标注"备份来源：v1 格式，无元数据" |
| 用户在高级别下请求确认 | 正常响应，权限开放不意味着必须省略沟通 |
| 合并恢复时发现重复条目 | 去重（集合语义），backup 原有条目优先于 user_additions |
| 已处于目标级别时切换 | 通知"已在 [级别名称] 模式，无需切换" |

## 维护须知

- **权限数据唯一权威源**：`references/levels.json`
- 修改权限列表时**只需修改 levels.json**，SKILL.md 通过 `详见 references/levels.json` 引用
- `TEMPLATE_ALL`（合并恢复使用）= L1 + L2 + L3 的 `permissions.allow` 条目并集（运行时聚合，不在 levels.json 中单独维护）
- v2 关键变更（vs v1）：显式 `_autoMode` 状态字段 + diff 恢复算法 + 移除 L2 中 `claude *`/`codex *` + 即时生效告知
