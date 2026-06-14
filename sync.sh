#!/usr/bin/env bash
# 系统配置同步脚本：GitHub 仓库 ↔ ~/.claude/
# 用法: bash sync.sh <deploy|collect|status>
# 每台机维护自己的 sync-config.json（不提交 git）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_HOME="${HOME}/.claude"
CONFIG="${SCRIPT_DIR}/sync-config.json"

# ===== 工具函数 =====
sha256() { sha256sum "$1" 2>/dev/null | cut -d' ' -f1 || shasum -a 256 "$1" 2>/dev/null | cut -d' ' -f1; }
now() { date '+%Y-%m-%d %H:%M:%S'; }

# ===== 配置读取 =====
if [ ! -f "$CONFIG" ]; then
    echo "[错误] 未找到 sync-config.json"
    echo "  请复制 sync-config.example.json 为 sync-config.json 并编辑"
    exit 1
fi

machine=$(grep '"machine"' "$CONFIG" | head -1 | sed 's/.*: *"//;s/".*//')
items=$(grep -A50 '"items"' "$CONFIG" | grep '"' | grep -v 'items' | grep -v '\]' | sed 's/.*"\(.*\)".*/\1/' | tr '\n' ' ')

echo ""
echo "=========================================="
echo "  机器: ${machine:-unknown}"
echo "=========================================="

# ===== deploy: repo → ~/.claude/ =====
do_deploy() {
    echo "[$(now)] 部署: repo → ~/.claude/"
    echo ""

    for item in $items; do
        src="${SCRIPT_DIR}/${item}"
        dst="${CLAUDE_HOME}/${item}"

        if [ ! -e "$src" ]; then
            echo "  [跳过] $item — 仓库中不存在"
            continue
        fi

        if [ -d "$src" ]; then
            _deploy_dir "$src" "$dst" "$item"
        else
            _deploy_file "$src" "$dst" "$item"
        fi
    done

    # Skills 按单个 skill 合并
    local repo_skills="${SCRIPT_DIR}/skills"
    local claude_skills="${CLAUDE_HOME}/skills"
    if [ -d "$repo_skills" ]; then
        for skill_dir in "$repo_skills"/*/; do
            [ -d "$skill_dir" ] || continue
            local name=$(basename "$skill_dir")
            [[ "$name" == _* ]] && continue
            local dst_dir="${claude_skills}/${name}"

            if [ -d "$dst_dir" ]; then
                local src_hash=$(sha256 "${skill_dir}/SKILL.md")
                local dst_hash=$(sha256 "${dst_dir}/SKILL.md")
                if [ "$src_hash" = "$dst_hash" ] && [ -n "$src_hash" ]; then
                    echo "  [跳过] skills/${name}/ — 无变化"
                    continue
                fi
            fi
            echo "  [部署] skills/${name}/"
            rm -rf "$dst_dir"
            cp -r "$skill_dir" "$dst_dir"
        done
    fi

    echo ""
    echo "[$(now)] 部署完成"
}

_deploy_file() {
    local src="$1" dst="$2" label="$3"
    if [ -f "$dst" ]; then
        local s=$(sha256 "$src"); local d=$(sha256 "$dst")
        if [ "$s" = "$d" ] && [ -n "$s" ]; then
            echo "  [跳过] $label — 无变化"
            return
        fi
    fi
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    echo "  [写入] $label"
}

_deploy_dir() {
    local src="$1" dst="$2" label="$3"
    local updated=0 skipped=0
    for f in $(find "$src" -type f); do
        local rel="${f#$src/}"
        local df="${dst}/${rel}"
        if [ -f "$df" ]; then
            local s=$(sha256 "$f"); local d=$(sha256 "$df")
            if [ "$s" = "$d" ] && [ -n "$s" ]; then
                ((skipped++)) || true
                continue
            fi
        fi
        mkdir -p "$(dirname "$df")"
        cp "$f" "$df"
        ((updated++)) || true
    done
    if [ "$updated" -eq 0 ]; then
        echo "  [跳过] ${label}/ — ${skipped} 个文件无变化"
    else
        echo "  [写入] ${label}/ — ${updated} 更新, ${skipped} 跳过"
    fi
}

# ===== collect: ~/.claude/ → repo =====
do_collect() {
    echo "[$(now)] 收集: ~/.claude/ → repo"
    echo ""
    local changed=()

    for item in $items; do
        src="${CLAUDE_HOME}/${item}"
        dst="${SCRIPT_DIR}/${item}"

        if [ ! -e "$src" ]; then
            echo "  [跳过] $item — ~/.claude/ 中不存在"
            continue
        fi

        if [ -d "$src" ]; then
            _collect_dir "$src" "$dst" "$item" changed
        else
            if _collect_file "$src" "$dst" "$item"; then
                changed+=("$item")
            fi
        fi
    done

    # Skills
    local repo_skills="${SCRIPT_DIR}/skills"
    local claude_skills="${CLAUDE_HOME}/skills"
    if [ -d "$claude_skills" ]; then
        for skill_dir in "$claude_skills"/*/; do
            [ -d "$skill_dir" ] || continue
            local name=$(basename "$skill_dir")
            [[ "$name" == _* ]] && continue
            local dst_dir="${repo_skills}/${name}"

            if [ -d "$dst_dir" ]; then
                local src_hash=$(sha256 "${skill_dir}/SKILL.md")
                local dst_hash=$(sha256 "${dst_dir}/SKILL.md")
                if [ "$src_hash" = "$dst_hash" ] && [ -n "$src_hash" ]; then
                    continue
                fi
            fi
            echo "  [收集] skills/${name}/"
            rm -rf "$dst_dir"
            cp -r "$skill_dir" "$dst_dir"
            changed+=("skills/${name}/")
        done
    fi

    if [ ${#changed[@]} -gt 0 ]; then
        echo ""
        echo "  === 变更清单 ==="
        for c in "${changed[@]}"; do
            echo "    - $c"
        done
        echo ""
        echo "  共 ${#changed[@]} 项变更，请 commit & push"
    else
        echo ""
        echo "  [无变更]"
    fi
}

_collect_file() {
    local src="$1" dst="$2" label="$3"
    if [ ! -f "$dst" ] || [ "$(sha256 "$src")" != "$(sha256 "$dst")" ]; then
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        echo "  [收集] $label"
        return 0
    fi
    return 1
}

_collect_dir() {
    local src="$1" dst="$2" label="$3"
    local -n _changed=$4
    local count=0
    for f in $(find "$src" -type f); do
        local rel="${f#$src/}"
        local df="${dst}/${rel}"
        if [ ! -f "$df" ] || [ "$(sha256 "$f")" != "$(sha256 "$df")" ]; then
            mkdir -p "$(dirname "$df")"
            cp "$f" "$df"
            _changed+=("${label}/${rel}")
            ((count++)) || true
        fi
    done
    if [ "$count" -gt 0 ]; then
        echo "  [收集] ${label}/ — ${count} 个文件"
    fi
}

# ===== status: 查看状态 =====
do_status() {
    echo "[$(now)] 同步状态"
    echo ""

    for item in $items; do
        local repo_path="${SCRIPT_DIR}/${item}"
        local claude_path="${CLAUDE_HOME}/${item}"
        local repo_ok="✓"; [ -e "$repo_path" ] || repo_ok="✗"
        local claude_ok="✓"; [ -e "$claude_path" ] || claude_ok="✗"

        local dir="↔"
        [ ! -e "$claude_path" ] && dir="← 需部署"
        [ ! -e "$repo_path" ] && dir="→ 需收集"

        printf "  %s  %-30s  repo:%-2s  claude:%-2s\n" "$dir" "$item" "$repo_ok" "$claude_ok"
    done
}

# ===== 入口 =====
case "${1:-}" in
    deploy)  do_deploy ;;
    collect) do_collect ;;
    status)  do_status ;;
    *)
        echo "用法: bash sync.sh <deploy|collect|status>"
        echo "  deploy   — 将仓库配置部署到 ~/.claude/"
        echo "  collect  — 将 ~/.claude/ 变更收集到仓库"
        echo "  status   — 显示同步状态"
        exit 1
        ;;
esac
