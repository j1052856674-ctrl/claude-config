#!/usr/bin/env python3
"""
系统配置同步脚本：GitHub 仓库 ↔ ~/.claude/

用法:
  python sync.py deploy   将仓库配置部署到 ~/.claude/
  python sync.py collect  将 ~/.claude/ 变更收集到仓库
  python sync.py status   显示变更摘要（dry-run）

每台机维护自己的 sync-config.json（不提交 git）。
"""

import json
import os
import sys
import hashlib
import shutil
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
CONFIG_FILE = SCRIPT_DIR / "sync-config.json"

def load_config():
    if not CONFIG_FILE.exists():
        print(f"[错误] 未找到 {CONFIG_FILE}")
        print(f"  请复制 sync-config.example.json 为 sync-config.json 并填写机器名")
        sys.exit(1)
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def sha256_file(filepath: Path) -> str:
    if not filepath.is_file():
        return ""
    with open(filepath, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

def deploy(config):
    """部署：仓库 → ~/.claude/"""
    claude_home = Path.home() / ".claude"
    skills_exclude = set(config.get("skills", {}).get("exclude", []))

    print(f"\n{'='*50}")
    print(f"[部署] repo → {claude_home}")
    print(f"{'='*50}")

    for item in config["items"]:
        src = SCRIPT_DIR / item
        dst = claude_home / item
        if not src.exists():
            print(f"  [跳过] {item} — 仓库中不存在")
            continue
        if src.is_dir():
            _deploy_dir(src, dst)
        else:
            _deploy_file(src, dst)

    # Skills 按单个 skill 级别 hash 检测
    repo_skills = SCRIPT_DIR / "skills"
    claude_skills = claude_home / "skills"
    if repo_skills.is_dir():
        for skill_dir in sorted(repo_skills.iterdir()):
            if not skill_dir.is_dir():
                continue
            name = skill_dir.name
            if name.startswith("_") or name in skills_exclude:
                continue
            dst_dir = claude_skills / name
            src_hash = sha256_file(skill_dir / "SKILL.md")
            dst_hash = sha256_file(dst_dir / "SKILL.md") if dst_dir.is_dir() else ""
            if src_hash == dst_hash and src_hash:
                print(f"  [跳过] skills/{name}/ — 无变化")
                continue
            print(f"  [部署] skills/{name}/")
            if dst_dir.exists():
                shutil.rmtree(dst_dir)
            shutil.copytree(skill_dir, dst_dir)

    print(f"\n[完成] 部署结束")

def _deploy_file(src: Path, dst: Path):
    if dst.exists() and sha256_file(src) == sha256_file(dst):
        print(f"  [跳过] {src.name} — 无变化")
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print(f"  [写入] {src.name}")

def _deploy_dir(src: Path, dst: Path):
    updated, skipped = 0, 0
    for f in src.rglob("*"):
        if f.is_file():
            rel = f.relative_to(src)
            dst_f = dst / rel
            if dst_f.exists() and sha256_file(f) == sha256_file(dst_f):
                skipped += 1
                continue
            dst_f.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dst_f)
            updated += 1
    if updated == 0:
        print(f"  [跳过] {src.name}/ — {skipped} 个文件无变化")
    else:
        print(f"  [写入] {src.name}/ — {updated} 个更新, {skipped} 个跳过")

def collect(config):
    """收集：~/.claude/ → 仓库"""
    claude_home = Path.home() / ".claude"
    skills_exclude = set(config.get("skills", {}).get("exclude", []))
    changed = []

    print(f"\n{'='*50}")
    print(f"[收集] {claude_home} → repo")
    print(f"{'='*50}")

    for item in config["items"]:
        src = claude_home / item
        dst = SCRIPT_DIR / item
        if not src.exists():
            print(f"  [跳过] {item} — ~/.claude/ 中不存在")
            continue
        if src.is_dir():
            c = _collect_dir(src, dst, item)
            changed.extend(c)
        elif _collect_file(src, dst, item):
            changed.append(item)

    # Skills
    claude_skills = claude_home / "skills"
    repo_skills = SCRIPT_DIR / "skills"
    if claude_skills.is_dir():
        for skill_dir in sorted(claude_skills.iterdir()):
            if not skill_dir.is_dir():
                continue
            name = skill_dir.name
            if name.startswith("_") or name in skills_exclude:
                continue
            dst_dir = repo_skills / name
            src_hash = sha256_file(skill_dir / "SKILL.md")
            dst_hash = sha256_file(dst_dir / "SKILL.md") if dst_dir.is_dir() else ""
            if src_hash == dst_hash and src_hash:
                continue
            print(f"  [收集] skills/{name}/")
            if dst_dir.exists():
                shutil.rmtree(dst_dir)
            shutil.copytree(skill_dir, dst_dir)
            changed.append(f"skills/{name}/")

    if changed:
        print(f"\n[变更清单]")
        for c in changed:
            print(f"  - {c}")
        print(f"\n共 {len(changed)} 项变更，请 commit & push")
    else:
        print(f"\n[无变更]")

def _collect_file(src: Path, dst: Path, label: str) -> bool:
    if sha256_file(src) != sha256_file(dst):
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        print(f"  [收集] {label}")
        return True
    return False

def _collect_dir(src: Path, dst: Path, label: str) -> list:
    changed = []
    for f in src.rglob("*"):
        if f.is_file():
            rel = f.relative_to(src)
            dst_f = dst / rel
            if not dst_f.exists() or sha256_file(f) != sha256_file(dst_f):
                dst_f.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, dst_f)
                changed.append(f"{label}/{rel.as_posix()}")
    if changed:
        print(f"  [收集] {label}/ — {len(changed)} 个文件")
    return changed

def status(config):
    """显示变更摘要（dry-run）"""
    claude_home = Path.home() / ".claude"
    print(f"\n系统配置状态（~/.claude/ ↔ repo）")
    print(f"机器: {config.get('machine', 'unknown')}")
    print("-" * 40)

    for item in config["items"]:
        repo_path = SCRIPT_DIR / item
        claude_path = claude_home / item
        repo_ok = "✓" if repo_path.exists() else "✗"
        home_ok = "✓" if claude_path.exists() else "✗"
        if not claude_path.exists():
            dir_flag = "← 需部署"
        elif not repo_path.exists():
            dir_flag = "→ 需收集"
        else:
            dir_flag = "↔"
        print(f"  {dir_flag}  {item:30s}  repo:{repo_ok}  claude:{home_ok}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python sync.py <deploy|collect|status>")
        print("  deploy   — 将仓库配置部署到 ~/.claude/")
        print("  collect  — 将 ~/.claude/ 变更收集到仓库")
        print("  status   — 显示同步状态")
        sys.exit(1)

    cmd = sys.argv[1]
    cfg = load_config()

    if cmd == "deploy":
        deploy(cfg)
    elif cmd == "collect":
        collect(cfg)
    elif cmd == "status":
        status(cfg)
    else:
        print(f"未知命令: {cmd}")
        print("可用命令: deploy, collect, status")
        sys.exit(1)
