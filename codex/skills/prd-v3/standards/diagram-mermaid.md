# Mermaid 简版制图规范（PRD 正文内嵌版）

> 定位：轻量化、代码化、文档内嵌、去掉冗余细节、控制连线数量
> 适用场景：写 PRD 时直接嵌 markdown、快速评审、需求初稿

---

## 1. 架构图 Mermaid 细则

### 1.1 语法模板

```mermaid
flowchart TB
    %% classDef 定义（固定配色）
    classDef appLayer fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#166534
    classDef midLayer fill:#ffedd5,stroke:#f97316,stroke-width:2px,color:#9a3412
    classDef configLayer fill:#fefce8,stroke:#eab308,stroke-width:2px,color:#a16207
    classDef dataLayer fill:#ede9fe,stroke:#8b5cf6,stroke-width:2px,color:#5b21b6
    classDef fallback fill:#fecaca,stroke:#dc2626,stroke-width:2px,color:#991b1b

    %% 四层 subgraph（汇报版：只列名称，不画内部连线）
    subgraph L1 ["应用层"]
        Q[一键查询页]:::appLayer
        C[对话追问页]:::appLayer
        R[报告展示页]:::appLayer
    end

    subgraph L2 ["AI智能中台"]
        I[意图理解]:::midLayer
        D[数据检索]:::midLayer
        L[风险解读]:::midLayer
        AR[角色适配]:::midLayer
    end

    subgraph L3 ["Ontology配置层"]
        O1[字段含义]:::configLayer
        O2[风险关联]:::configLayer
        O3[角色视图]:::configLayer
    end

    subgraph L4 ["数据系统层"]
        T1[用户信息宽表]:::dataLayer
        T2[授信交易宽表]:::dataLayer
        S1[米霍克授信]:::dataLayer
        S2[米霍克交易]:::dataLayer
    end

    %% 粗粒度连线（只画大模块间汇总线，4~6根）
    L1 --> L2
    L2 --> L4
    L4 -.-> L2
    L2 -.-> L1
    L2 -.-> L3

    style L1 fill:#d1fae5,stroke:#10b981,stroke-width:2px
    style L2 fill:#ffedd5,stroke:#f97316,stroke-width:2px
    style L3 fill:#fefce8,stroke:#eab308,stroke-width:2px
    style L4 fill:#ede9fe,stroke:#8b5cf6,stroke-width:2px
```

### 1.2 强制规则

| # | 规则 | 说明 |
|---|------|------|
| 1 | **只画汇总线** | 大模块间只画 1 根汇总连线，禁止子节点全量细线 |
| 2 | **内部子模块无线** | 宽表/配置字段只罗列名称，不画内部连线 |
| 3 | **红色=异常降级** | 降级输出节点用 `classDef fallback`，代码内加 `%% 图例：红色=异常降级` |
| 4 | **注释标注图例** | 顶部用 `%%` 注释标注配色含义和虚实线定义 |

---

## 2. 业务流程图 Mermaid 细则

### 2.1 语法模板

```mermaid
flowchart TD
    classDef process fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e40af
    classDef decision fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#92400e
    classDef endpoint fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#166534
    classDef error fill:#fecaca,stroke:#dc2626,stroke-width:2px,color:#991b1b
    classDef v2new fill:#ffedd5,stroke:#f97316,stroke-width:2px,color:#9a3412,stroke-dasharray: 5 5

    Start([开始]):::endpoint --> Input([输入用户ID]):::endpoint
    Input --> Mode{交互模式}:::decision
    Mode -->|"一键查询"| Query["生成查询并检索数据"]:::process
    Mode -->|"追问"| Follow["理解追问意图并检索"]:::process
    %% ... 主干流程 ...

    %% 异常分支（虚线）
    Query -.->|"超时"| Timeout["提示超时请重试"]:::error -.-> End
    %% 二期新增（虚线外框）
    End -.->|"二期新增"| V2Predict["风险趋势预测"]:::v2new
```

### 2.2 强制规则

| # | 规则 | 说明 |
|---|------|------|
| 1 | **标准符号** | `([开始])` 圆角=起止，`[步骤]` 矩形=处理，`{判断}` 菱形=分支 |
| 2 | **主干实线** | 正常流程用实线 `-->` |
| 3 | **异常虚线** | 超时/失败/降级用虚线 `-.->` |
| 4 | **菱形分支标注** | 连线必须标注 `--|"分支文案"|>` |
| 5 | **精简折返线** | 避免多余折返，主干从上到下 |
| 6 | **注释标注图例** | `%% 虚线框=二期迭代内容` |

---

## 3. 泳道图 Mermaid 细则

### 3.1 语法模板

```mermaid
flowchart LR
    classDef aiStep fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e40af
    classDef dataStep fill:#ede9fe,stroke:#8b5cf6,stroke-width:2px,color:#5b21b6
    classDef mihawkStep fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#166534
    classDef userStep fill:#ecfeff,stroke:#06b6d4,stroke-width:2px,color:#0e7490
    classDef decision fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#92400e
    classDef fallback fill:#fecaca,stroke:#dc2626,stroke-width:2px,color:#991b1b

    subgraph col1 ["用户端系统"]
        direction TB
        U1(["发起查询"]):::userStep
        U2(["查看报告"]):::userStep
    end

    subgraph col2 ["AI智能中台"]
        direction TB
        A1["意图理解"]:::aiStep
        A2["风险解读"]:::aiStep
        A3{角色适配}:::decision
        A4["降级输出"]:::fallback
    end

    subgraph col3 ["大数据平台SR"]
        direction TB
        S1["宽表查询"]:::dataStep
        S2["超时处理"]:::dataStep
    end

    subgraph col4 ["米霍克决策引擎"]
        direction TB
        M1["规则查询"]:::mihawkStep
        M2["名单查询"]:::mihawkStep
    end

    %% 粗粒度：只画跨系统汇总线
    U1 --> col2
    col2 --> col3
    col2 --> col4
    col3 -.-> col2
    col4 -.-> col2
    col2 --> U2
    col3 -.-> A4
    A4 -.-> U2

    style col1 fill:#f0f9ff,stroke:#06b6d4,stroke-width:2px
    style col2 fill:#eff6ff,stroke:#3b82f6,stroke-width:2px
    style col3 fill:#f5f3ff,stroke:#8b5cf6,stroke-width:1px,stroke-dasharray: 5 5
    style col4 fill:#f0fdf4,stroke:#10b981,stroke-width:2px
```

### 3.2 强制规则

| # | 规则 | 说明 |
|---|------|------|
| 1 | **顶层 LR** | `flowchart LR` 横向排布泳道列 |
| 2 | **列内 TB** | 每个 `subgraph` 内部 `direction TB` 纵向走流程 |
| 3 | **粗粒度汇总线** | 跨系统只画 1 根汇总线，明细调用不进主泳道图 |
| 4 | **实线=调用** | 主动同步调用（左→右，上→下） |
| 5 | **虚线=回传** | 数据回传（右→左，下→上） |
| 6 | **无箭头文字** | 箭头上不写描述，描述放进节点框内 |
| 7 | **4列标准口径** | 用户端 / AI中台 / 大数据 / 决策引擎 |

---

## 4. 图例注释标准

```
%% 图例注释（必须放在代码顶部）
%% 配色：浅绿=应用层，浅橙=AI中台，米黄=配置层，浅紫=数据层，红色=异常降级
%% 实线=上层主动调用，虚线=下层数据回传
%% 圆角矩形=开始/结束，直角矩形=处理步骤，菱形=判断分支
```

---

*规范版本：v1.0 | 创建日期：2026/06/05*