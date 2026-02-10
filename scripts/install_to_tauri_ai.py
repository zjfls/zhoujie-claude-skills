#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class Skill:
    dir_name: str
    path: Path
    name: str
    description: str | None
    metadata: dict[str, Any]


def _read_front_matter(text: str) -> str | None:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return "\n".join(lines[1:i])
    return None


def _parse_simple_yaml(front_matter: str) -> dict[str, Any]:
    """
    Minimal YAML parser for skill front matter.

    Supports:
      - top-level `key: value`
      - nested mapping via indentation (2+ spaces), e.g.:
            metadata:
              short-description: ...

    This intentionally does NOT implement full YAML.
    """
    root: dict[str, Any] = {}
    stack: list[tuple[int, dict[str, Any]]] = [(0, root)]

    for raw in front_matter.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        line = raw.strip()
        if ":" not in line:
            continue
        key, rest = line.split(":", 1)
        key = key.strip()
        value = rest.strip()

        while len(stack) > 1 and indent <= stack[-1][0]:
            stack.pop()
        current = stack[-1][1]

        if value == "":
            child: dict[str, Any] = {}
            current[key] = child
            stack.append((indent, child))
            continue

        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        current[key] = value

    return root


def _load_install_config(repo_root: Path) -> dict[str, Any]:
    cfg_path = repo_root / "tauri-ai.install.json"
    if not cfg_path.exists():
        return {}
    return json.loads(cfg_path.read_text(encoding="utf-8"))


def _discover_skills(repo_root: Path) -> list[Skill]:
    skills_dir = repo_root / "skills"
    if not skills_dir.exists():
        raise SystemExit(f"Missing skills dir: {skills_dir}")

    found: list[Skill] = []
    for child in sorted(skills_dir.iterdir()):
        if not child.is_dir():
            continue
        skill_md = child / "SKILL.md"
        if not skill_md.exists():
            continue
        text = skill_md.read_text(encoding="utf-8")
        fm = _read_front_matter(text) or ""
        data = _parse_simple_yaml(fm) if fm else {}
        name = str(data.get("name") or child.name).strip()
        description = data.get("description")
        metadata = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}
        found.append(
            Skill(
                dir_name=child.name,
                path=child,
                name=name,
                description=str(description).strip() if description else None,
                metadata=metadata,
            )
        )
    return found


def _skill_category(skill: Skill, install_cfg: dict[str, Any]) -> str:
    overrides = install_cfg.get("skillOverrides") or {}
    if isinstance(overrides, dict) and skill.name in overrides:
        return str(overrides[skill.name])

    meta_cat = None
    if isinstance(skill.metadata, dict):
        meta_cat = skill.metadata.get("tauri-ai-category") or skill.metadata.get(
            "tauri_category"
        )
    if meta_cat:
        return str(meta_cat)

    prefix_map = install_cfg.get("categoriesByNamePrefix") or {}
    if isinstance(prefix_map, dict):
        for prefix, cat in prefix_map.items():
            if skill.name.startswith(str(prefix)):
                return str(cat)

    if skill.name.startswith("system-"):
        return "system"
    if skill.name.startswith("code-"):
        return "code"

    return str(install_cfg.get("defaultCategory") or "learn")


def _ensure_dir(p: Path, dry_run: bool) -> None:
    if dry_run:
        return
    p.mkdir(parents=True, exist_ok=True)


def _timestamp() -> str:
    return _dt.datetime.now().strftime("%Y%m%d-%H%M%S")


def _install_symlink(src_dir: Path, dest_link: Path, *, force: bool, dry_run: bool) -> str:
    src_dir = src_dir.resolve()
    if dest_link.exists() or dest_link.is_symlink():
        if dest_link.is_symlink():
            try:
                current = dest_link.resolve()
            except OSError:
                current = None
            if current == src_dir:
                return "kept"
        if not force:
            return "skipped_exists"
        backup = dest_link.with_name(dest_link.name + f".bak.{_timestamp()}")
        if not dry_run:
            dest_link.rename(backup)
    if not dry_run:
        os.symlink(str(src_dir), str(dest_link))
    return "linked"


def _update_tauri_config(
    tauri_dir: Path, skill_names: list[str], set_name: str | None, dry_run: bool
) -> str:
    cfg_path = tauri_dir / "config.json"
    if not cfg_path.exists():
        return "config_missing"

    obj = json.loads(cfg_path.read_text(encoding="utf-8"))
    skills_cfg = obj.setdefault("skills", {})
    sets = skills_cfg.setdefault("sets", [])

    target = None
    if isinstance(sets, list):
        if set_name:
            for s in sets:
                if isinstance(s, dict) and s.get("name") == set_name:
                    target = s
                    break
        if target is None and sets:
            target = sets[0] if isinstance(sets[0], dict) else None

    if target is None:
        target = {"name": set_name or "Custom", "enabled": True, "skills": [], "disabledSkills": []}
        sets.append(target)

    lst = target.setdefault("skills", [])
    if not isinstance(lst, list):
        lst = []
        target["skills"] = lst

    before = set(map(str, lst))
    for n in skill_names:
        if n not in before:
            lst.append(n)
            before.add(n)

    if not dry_run:
        cfg_path.write_text(
            json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    return "config_updated"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Install local skills into ~/.tauri-ai by creating symlinks and updating config.json."
    )
    parser.add_argument(
        "--repo",
        default=str(Path.cwd()),
        help="Repo root (default: current working directory)",
    )
    parser.add_argument(
        "--tauri-dir",
        default=str(Path.home() / ".tauri-ai"),
        help="Tauri AI config dir (default: ~/.tauri-ai)",
    )
    parser.add_argument(
        "--set-name",
        default=None,
        help="skills.sets[].name to append skill names into (default: first set)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print actions without changes")
    parser.add_argument("--force", action="store_true", help="Replace existing dest by backing up")
    args = parser.parse_args()

    repo_root = Path(args.repo).expanduser().resolve()
    tauri_dir = Path(args.tauri_dir).expanduser().resolve()

    install_cfg = _load_install_config(repo_root)
    skills = _discover_skills(repo_root)
    if not skills:
        raise SystemExit("No skills found under ./skills/*/SKILL.md")

    installed: list[str] = []
    actions: list[str] = []

    for s in skills:
        cat = _skill_category(s, install_cfg)
        dest_root = tauri_dir / "skills" / cat
        _ensure_dir(dest_root, args.dry_run)
        dest_link = dest_root / s.dir_name
        result = _install_symlink(s.path, dest_link, force=args.force, dry_run=args.dry_run)
        actions.append(f"{s.name} -> {dest_link} [{result}]")
        if result in ("linked", "kept"):
            installed.append(s.name)

    cfg_set_name = args.set_name or install_cfg.get("configSetName")
    config_result = _update_tauri_config(
        tauri_dir, sorted(set(installed)), str(cfg_set_name) if cfg_set_name else None, args.dry_run
    )

    print(f"Repo: {repo_root}")
    print(f"Tauri: {tauri_dir}")
    print("Actions:")
    for a in actions:
        print(f"  - {a}")
    print(f"Config: {config_result}")
    if args.dry_run:
        print("Dry-run: no changes written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

