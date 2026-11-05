#!/usr/bin/env python3
"""MuPiBox-NG .mupiapp validator and packager (developer preview v1).

Python standard library only. Validation is NOT a malware scanner or sandbox.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath

MAX_FILES = 200
MAX_TOTAL_BYTES = 50 * 1024 * 1024
MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_MANIFEST_BYTES = 1024 * 1024
MAX_COMPRESSION_RATIO = 200
ALLOWED_PERMISSIONS = {"storage", "controller", "audio", "camera", "photo-save", "network"}
ALLOWED_FIELDS = {
    "apiVersion", "id", "name", "version", "runtime", "entry", "icon",
    "description", "author", "permissions", "networkHosts", "display",
}
APP_ID = re.compile(r"^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$")
SEMVER = re.compile(r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
HOSTNAME = re.compile(r"^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$")


class PackageError(ValueError):
    pass


def checked_path(raw: str) -> str:
    if not isinstance(raw, str) or not raw or len(raw) > 255:
        raise PackageError("invalid package path")
    if ("\\" in raw or "\x00" in raw or raw.startswith("/") or
            raw.startswith("./") or any(x in ("", ".", "..") for x in raw.split("/")) or
            any(ord(c) < 32 for c in raw)):
        raise PackageError(f"unsafe package path: {raw!r}")
    if not all(re.fullmatch(r"[A-Za-z0-9_. -]+", part) for part in raw.split("/")):
        raise PackageError(f"unsupported path characters: {raw!r}")
    if PurePosixPath(raw).as_posix() != raw:
        raise PackageError(f"noncanonical package path: {raw!r}")
    return raw


def _string(data: dict, key: str, minlen: int, maxlen: int, required: bool = False) -> str | None:
    val = data.get(key)
    if val is None and not required:
        return None
    if not isinstance(val, str) or not minlen <= len(val) <= maxlen:
        raise PackageError(f"manifest {key!r} must be a string ({minlen}..{maxlen} chars)")
    return val


def validate_manifest(data: object, files: set[str]) -> dict:
    if not isinstance(data, dict):
        raise PackageError("manifest must be a JSON object")
    required = {"apiVersion", "id", "name", "version", "runtime", "entry", "permissions"}
    if missing := required - data.keys():
        raise PackageError(f"required manifest fields missing: {', '.join(sorted(missing))}")
    if unknown := data.keys() - ALLOWED_FIELDS:
        raise PackageError(f"unknown manifest fields: {', '.join(sorted(unknown))}")
    if data["apiVersion"] != "1" or data["runtime"] != "web":
        raise PackageError("only apiVersion '1' and runtime 'web' are supported")
    app_id = _string(data, "id", 5, 128, True)
    if not APP_ID.fullmatch(app_id):
        raise PackageError("id must be a lowercase reverse-domain-like identifier")
    _string(data, "name", 2, 80, True)
    version = _string(data, "version", 5, 120, True)
    if not SEMVER.fullmatch(version):
        raise PackageError("version must be SemVer, e.g. '0.1.0'")
    _string(data, "description", 0, 500)
    _string(data, "author", 0, 100)
    entry = checked_path(_string(data, "entry", 6, 255, True))
    if not entry.endswith(".html") or entry not in files:
        raise PackageError("entry must point to an existing .html file")
    if (icon := _string(data, "icon", 5, 255)) is not None:
        checked_path(icon)
        if icon not in files or not icon.endswith((".svg", ".png")):
            raise PackageError("icon must point to an existing .svg/.png file")
    perms = data["permissions"]
    if not isinstance(perms, list) or len(perms) > 6 or any(type(p) is not str for p in perms):
        raise PackageError("permissions must be a string array")
    if len(set(perms)) != len(perms) or not set(perms).issubset(ALLOWED_PERMISSIONS):
        raise PackageError("permissions contain duplicates or unsupported values")
    hosts = data.get("networkHosts")
    if "network" in perms:
        if not isinstance(hosts, list) or not hosts or len(hosts) > 20:
            raise PackageError("network permission requires 1..20 explicit networkHosts")
        if any(not isinstance(h, str) or len(h) > 253 or not HOSTNAME.fullmatch(h) for h in hosts):
            raise PackageError("networkHosts must contain valid lowercase hostnames")
        if len(set(hosts)) != len(hosts):
            raise PackageError("duplicate networkHosts")
    elif hosts is not None:
        raise PackageError("networkHosts requires network permission")
    display = data.get("display")
    if display is not None:
        if not isinstance(display, dict) or set(display) - {"orientation", "minWidth", "minHeight"}:
            raise PackageError("invalid display object")
        if display.get("orientation") not in ("any", "landscape", "portrait"):
            raise PackageError("display.orientation must be any/landscape/portrait")
        for dimension in ("minWidth", "minHeight"):
            if dimension in display:
                val = display[dimension]
                if type(val) is not int or not 240 <= val <= 4096 or (dimension == "minWidth" and val < 320):
                    raise PackageError(f"invalid {dimension}")
    return data


def validate_package(path: Path) -> dict:
    if not zipfile.is_zipfile(path):
        raise PackageError("file is not a ZIP/.mupiapp archive")
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        if len(infos) > MAX_FILES:
            raise PackageError("too many archive entries")
        seen: set[str] = set()
        names: set[str] = set()
        total = 0
        for info in infos:
            if info.is_dir():
                raise PackageError("directory entries not needed (files only)")
            name = checked_path(info.filename)
            if name.casefold() in seen:
                raise PackageError(f"duplicate/case-colliding path: {name}")
            seen.add(name.casefold())
            names.add(name)
            mode = (info.external_attr >> 16) & 0xFFFF
            if stat.S_IFMT(mode) not in (0, stat.S_IFREG):
                raise PackageError(f"nonregular archive entry: {name}")
            if info.file_size > MAX_FILE_BYTES:
                raise PackageError(f"oversized file: {name}")
            if info.compress_size == 0 and info.file_size:
                raise PackageError(f"invalid compressed size: {name}")
            if info.file_size and info.file_size / max(1, info.compress_size) > MAX_COMPRESSION_RATIO:
                raise PackageError(f"suspicious compression ratio: {name}")
            total += info.file_size
            if total > MAX_TOTAL_BYTES:
                raise PackageError("archive exceeds uncompressed size limit")
        if "manifest.json" not in names:
            raise PackageError("missing manifest.json at archive root")
        info = archive.getinfo("manifest.json")
        if info.file_size > MAX_MANIFEST_BYTES:
            raise PackageError("manifest too large")
        try:
            manifest = json.loads(archive.read(info).decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise PackageError("manifest is not valid UTF-8 JSON") from exc
        return validate_manifest(manifest, names)


def pack(source: Path, destination: Path) -> dict:
    source = source.resolve()
    destination = destination.resolve()
    if not source.is_dir():
        raise PackageError(f"source is not a directory: {source}")
    if source in destination.parents:
        raise PackageError("destination must not be inside source directory")
    names: set[str] = set()
    paths: list[tuple[str, Path]] = []
    total = 0
    for root, dirs, filenames in os.walk(source, followlinks=False):
        for d in dirs:
            if (Path(root) / d).is_symlink():
                raise PackageError("symlinked directories are forbidden")
        for filename in filenames:
            actual = Path(root) / filename
            if actual.is_symlink() or not actual.is_file():
                raise PackageError(f"nonregular file: {actual}")
            name = checked_path(actual.relative_to(source).as_posix())
            if name.casefold() in names:
                raise PackageError("case-colliding paths")
            names.add(name.casefold())
            total += actual.stat().st_size
            if actual.stat().st_size > MAX_FILE_BYTES or total > MAX_TOTAL_BYTES:
                raise PackageError("input size limit exceeded")
            paths.append((name, actual))
            if len(paths) > MAX_FILES:
                raise PackageError("too many files")
    manifest_path = source / "manifest.json"
    if not manifest_path.is_file() or manifest_path.stat().st_size > MAX_MANIFEST_BYTES:
        raise PackageError("manifest.json missing or too large")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise PackageError("manifest is not valid UTF-8 JSON") from exc
    validate_manifest(manifest, {name for name, _ in paths})
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Deterministic entries and timestamps for reproducible builds.
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name, actual in sorted(paths):
            meta = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            meta.compress_type = zipfile.ZIP_DEFLATED
            meta.external_attr = (stat.S_IFREG | 0o644) << 16
            archive.writestr(meta, actual.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)
    return validate_package(destination)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest="command", required=True)
    sub_validate = subs.add_parser("validate", help="validate a .mupiapp ZIP")
    sub_validate.add_argument("archive", type=Path)
    sub_pack = subs.add_parser("pack", help="create a .mupiapp ZIP from a directory")
    sub_pack.add_argument("directory", type=Path)
    sub_pack.add_argument("archive", type=Path)
    args = parser.parse_args()
    try:
        manifest = validate_package(args.archive) if args.command == "validate" else pack(args.directory, args.archive)
    except (PackageError, OSError, zipfile.BadZipFile) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"OK: {manifest['id']} v{manifest['version']} (API {manifest['apiVersion']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
