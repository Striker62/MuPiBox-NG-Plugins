#!/usr/bin/env python3
"""MuPiBox-NG .mupiapp validator and packager (developer preview v1).

Python standard library only. Validation is NOT a malware scanner or sandbox.
"""

from __future__ import annotations

import argparse
import json
import math
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
# Match the MuPiBox-NG plugin host archive allowlist; documentation belongs in the repository.
HOST_ALLOWED_EXTENSIONS = {
    ".html", ".htm", ".js", ".mjs", ".css", ".wasm", ".json",
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".mp3", ".ogg", ".wav", ".txt",
}
ALLOWED_PERMISSIONS = {"storage", "controller", "audio", "camera", "photo-save", "shared-assets", "network", "links", "homeassistant", "device-status", "playback", "playback-control"}
ALLOWED_FIELDS = {
    "apiVersion", "id", "name", "version", "runtime", "entry", "icon", "cover",
    "description", "author", "permissions", "networkHosts", "display",
    "category", "galleryDirectories", "sharedDirectories", "adminSettings",
    "admin", "permissionReasons",
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



def validate_admin_settings(spec: object) -> None:
    """Host-compatible, no-code form description. Never accepts arbitrary HTML or secrets."""
    if not isinstance(spec, dict) or set(spec) - {"title", "description", "fields"}:
        raise PackageError("adminSettings must be a declarative object")
    for key, limit in (("title", 100), ("description", 500)):
        if key in spec and (not isinstance(spec[key], str) or len(spec[key].encode("utf-8")) > limit):
            raise PackageError(f"invalid adminSettings {key}")
    fields = spec.get("fields")
    if not isinstance(fields, list) or not 1 <= len(fields) <= 32:
        raise PackageError("adminSettings needs 1..32 fields")
    seen: set[str] = set()
    for field in fields:
        if not isinstance(field, dict) or set(field) - {
            "key", "label", "help", "group", "type", "default",
            "minLength", "maxLength", "min", "max", "options",
        }:
            raise PackageError("adminSettings field has unsupported attributes")
        key = field.get("key")
        if not isinstance(key, str) or not re.fullmatch(r"[a-z][A-Za-z0-9_]{0,39}", key) or key in seen:
            raise PackageError("invalid or duplicate adminSettings key")
        seen.add(key)
        for label, maximum, minimum in (("label", 100, 1), ("help", 300, 0), ("group", 80, 0)):
            if (label in field or minimum) and (
                    not isinstance(field.get(label), str) or
                    not minimum <= len(field[label].encode("utf-8")) <= maximum):
                raise PackageError(f"invalid adminSettings {label}")
        typ = field.get("type")
        value = field.get("default")
        if typ not in ("boolean", "string", "integer", "select"):
            raise PackageError("unsupported adminSettings field type")
        if "default" not in field:
            raise PackageError("adminSettings default required")
        if typ != "string" and ("minLength" in field or "maxLength" in field):
            raise PackageError("minLength/maxLength only allowed on strings")
        if typ != "integer" and ("min" in field or "max" in field):
            raise PackageError("min/max only allowed on integers")
        if typ != "select" and "options" in field:
            raise PackageError("options only allowed on selects")
        if typ == "boolean" and type(value) is not bool:
            raise PackageError("boolean default required")
        if typ == "string":
            a, b = field.get("minLength", 0), field.get("maxLength", 200)
            if type(a) is not int or type(b) is not int or not 0 <= a <= b <= 200 or b < 1:
                raise PackageError("invalid string limits")
            if not isinstance(value, str) or not a <= len(value) <= b:
                raise PackageError("invalid string default")
        if typ == "integer":
            a, b = field.get("min", -1000000), field.get("max", 1000000)
            if type(a) is not int or type(b) is not int or not -1000000 <= a <= b <= 1000000:
                raise PackageError("invalid integer limits")
            if type(value) is not int or not a <= value <= b:
                raise PackageError("invalid integer default")
        if typ == "select":
            opts = field.get("options")
            if not isinstance(opts, list) or not 2 <= len(opts) <= 30:
                raise PackageError("select needs 2..30 options")
            chosen = set()
            for item in opts:
                if not isinstance(item, dict) or set(item) != {"label", "value"}:
                    raise PackageError("invalid select option")
                if (not isinstance(item["label"], str) or not 1 <= len(item["label"].encode("utf-8")) <= 100
                        or not isinstance(item["value"], str) or not 1 <= len(item["value"].encode("utf-8")) <= 100
                        or item["value"] in chosen):
                    raise PackageError("invalid or duplicate select choice")
                chosen.add(item["value"])
            if type(value) is not str or value not in chosen:
                raise PackageError("select default must match declared choice")



def validate_admin_surface(surface: object, manifest: dict, files: set[str]) -> None:
    if not isinstance(surface, dict) or set(surface) - {"entry", "capabilities", "directories"}:
        raise PackageError("admin must be a declarative, capability-scoped object")
    if manifest.get("runtime") != "web":
        raise PackageError("admin HTML pages require web runtime")
    entry = surface.get("entry")
    if (not isinstance(entry, str) or not entry.startswith("admin/")
            or not entry.endswith(".html") or entry not in files):
        raise PackageError("admin.entry must exist under admin/ as .html")
    checked_path(entry)
    supported = {"settings.read", "settings.write", "files.list", "files.read", "files.write", "files.trash"}
    permissions = surface.get("capabilities")
    if (not isinstance(permissions, list) or not 1 <= len(permissions) <= len(supported)
            or any(not isinstance(p, str) for p in permissions)
            or len(set(permissions)) != len(permissions) or not set(permissions) <= supported):
        raise PackageError("invalid admin.capabilities")
    folders = surface.get("directories", [])
    if (not isinstance(folders, list) or len(folders) > 8 or
            any(not isinstance(x, str) for x in folders) or len(set(folders)) != len(folders)):
        raise PackageError("invalid admin.directories")
    file_caps = any(p.startswith("files.") for p in permissions)
    if file_caps and not folders:
        raise PackageError("admin files.* requires declared directories")
    if folders and not file_caps:
        raise PackageError("admin directories need a files.* capability")
    if file_caps and "shared-assets" not in manifest["permissions"]:
        raise PackageError("admin files.* requires shared-assets")
    allowed = set(manifest.get("sharedDirectories", []))
    if any(folder not in allowed for folder in folders):
        raise PackageError("admin.directories must be a subset of sharedDirectories")


def validate_permission_reasons(reasons: object, permissions: list[str]) -> None:
    if not isinstance(reasons, dict):
        raise PackageError("permissionReasons must be a map")
    for key, value in reasons.items():
        if (key not in permissions or not isinstance(value, str)
                or not 1 <= len(value.encode("utf-8")) <= 300 or not value.strip()):
            raise PackageError("invalid permission reason")


def validate_manifest(data: object, files: set[str]) -> dict:
    if not isinstance(data, dict):
        raise PackageError("manifest must be a JSON object")
    required = {"apiVersion", "id", "name", "version", "runtime", "entry", "permissions"}
    if missing := required - data.keys():
        raise PackageError(f"required manifest fields missing: {', '.join(sorted(missing))}")
    if unknown := data.keys() - ALLOWED_FIELDS:
        raise PackageError(f"unknown manifest fields: {', '.join(sorted(unknown))}")
    if data["apiVersion"] != "1" or data["runtime"] not in ("web", "qtquick-scene"):
        raise PackageError("only API 1 web or qtquick-scene runtimes are supported")
    app_id = _string(data, "id", 5, 128, True)
    if app_id == "community.mupi-run-native" and data["runtime"] != "qtquick-scene":
        raise PackageError("runner preview ID requires its built-in engine")
    if not APP_ID.fullmatch(app_id):
        raise PackageError("id must be a lowercase reverse-domain-like identifier")
    _string(data, "name", 2, 80, True)
    version = _string(data, "version", 5, 120, True)
    if not SEMVER.fullmatch(version):
        raise PackageError("version must be SemVer, e.g. '0.1.0'")
    _string(data, "description", 0, 500)
    _string(data, "author", 0, 100)
    entry = checked_path(_string(data, "entry", 6, 255, True))
    if entry not in files or not entry.endswith(".html" if data["runtime"] == "web" else ".json"):
        raise PackageError("entry must point to existing HTML (web) or JSON (qtquick-scene)")
    if (icon := _string(data, "icon", 5, 255)) is not None:
        checked_path(icon)
        if icon not in files or not icon.endswith((".svg", ".png")):
            raise PackageError("icon must point to an existing .svg/.png file")
    if (cover := _string(data, "cover", 5, 255)) is not None:
        checked_path(cover)
        if cover not in files or not cover.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            raise PackageError("cover must point to an existing PNG/JPEG/WebP file")
    perms = data["permissions"]
    if not isinstance(perms, list) or len(perms) > len(ALLOWED_PERMISSIONS) or any(type(p) is not str for p in perms):
        raise PackageError("permissions must be a string array")
    if len(set(perms)) != len(perms) or not set(perms).issubset(ALLOWED_PERMISSIONS):
        raise PackageError("permissions contain duplicates or unsupported values")
    if data["runtime"] == "qtquick-scene":
        if not set(perms).issubset({"storage", "audio", "controller"}) or data.get("galleryDirectories") or data.get("sharedDirectories"):
            raise PackageError("qtquick-scene supports only scoped storage, audio and controller permissions")
        if any(PurePosixPath(name).suffix.lower() in {".html", ".htm", ".js", ".mjs", ".wasm", ".svg"} for name in files):
            raise PackageError("qtquick-scene packages must not contain executable/active assets")
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
    category = data.get("category")
    if category is not None and category not in ("games", "creative", "learning", "tools", "other"):
        raise PackageError("invalid app category")
    gallery_directories = data.get("galleryDirectories")
    if gallery_directories is not None:
        if not isinstance(gallery_directories, list) or len(gallery_directories) > 8:
            raise PackageError("galleryDirectories must contain at most 8 entries")
        if "photo-save" not in perms:
            raise PackageError("galleryDirectories requires photo-save permission")
        seen_gallery_paths: set[str] = set()
        for directory in gallery_directories:
            if not isinstance(directory, dict) or set(directory) - {"path", "name"}:
                raise PackageError("invalid gallery directory object")
            path = directory.get("path")
            if (not isinstance(path, str) or len(path) > 160
                    or not re.fullmatch(r"photos(?:/[A-Za-z0-9_-]+){0,5}", path)
                    or path in seen_gallery_paths):
                raise PackageError("unsafe or duplicate gallery directory path")
            seen_gallery_paths.add(path)
            if "name" in directory and (not isinstance(directory["name"], str) or len(directory["name"]) > 100):
                raise PackageError("invalid gallery directory name")
    shared_directories = data.get("sharedDirectories")
    if shared_directories is not None:
        if not isinstance(shared_directories, list) or len(shared_directories) > 8:
            raise PackageError("sharedDirectories must contain at most 8 entries")
        if "shared-assets" not in perms:
            raise PackageError("sharedDirectories requires shared-assets permission")
        validated: list[str] = []
        for directory in shared_directories:
            if (not isinstance(directory, str) or len(directory) > 120
                    or not re.fullmatch(r"[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+){0,5}", directory)):
                raise PackageError("unsafe shared directory path")
            folded = directory.casefold()
            if any(folded == existing or folded.startswith(existing + "/")
                   or existing.startswith(folded + "/") for existing in validated):
                raise PackageError("duplicate or overlapping shared directories")
            validated.append(folded)
    display = data.get("display")
    if display is not None:
        if not isinstance(display, dict) or set(display) - {"orientation", "minWidth", "minHeight", "showBackButton", "showSystemInfo", "fullScreen", "background"}:
            raise PackageError("invalid display object")
        if "orientation" in display and display["orientation"] not in ("any", "landscape", "portrait"):
            raise PackageError("display.orientation must be any/landscape/portrait")
        for flag in ("showBackButton", "showSystemInfo", "fullScreen"):
            if flag in display and type(display[flag]) is not bool:
                raise PackageError(f"invalid {flag} (boolean required)")
        if "background" in display and display["background"] not in ("system", "app"):
            raise PackageError("display.background must be system or app")
        for dimension in ("minWidth", "minHeight"):
            if dimension in display:
                val = display[dimension]
                if type(val) is not int or not 240 <= val <= 4096 or (dimension == "minWidth" and val < 320):
                    raise PackageError(f"invalid {dimension}")
    if "adminSettings" in data:
        validate_admin_settings(data["adminSettings"])
    if "admin" in data:
        validate_admin_surface(data["admin"], data, files)
    if "permissionReasons" in data:
        validate_permission_reasons(data["permissionReasons"], perms)
    return data


def validate_qt_scene(data: bytes, files: set[str], permissions: list[str], app_id: str = "") -> dict:
    """Validate passive scene data; never load arbitrary external QML in the host."""
    if not data or len(data) > 32 * 1024:
        raise PackageError("qtquick scene size exceeds 32 KiB")
    try:
        scene = json.loads(data)
    except (UnicodeDecodeError, ValueError) as exc:
        raise PackageError("qtquick scene is not UTF-8 JSON") from exc
    if not isinstance(scene, dict) or set(scene) - {"sceneVersion", "title", "background", "elements", "engine", "optionalSounds"}:
        raise PackageError("invalid qtquick scene fields")
    color = lambda value: isinstance(value, str) and re.fullmatch(r"#[0-9A-Fa-f]{6}", value) is not None
    if (type(scene.get("sceneVersion")) is not int or scene["sceneVersion"] != 1
            or not color(scene.get("background"))
            or not isinstance(scene.get("title", ""), str)
            or len(scene.get("title", "")) > 120
            or not isinstance(scene.get("elements"), list)
            or len(scene["elements"]) > 48):
        raise PackageError("invalid qtquick scene metadata")
    if "engine" in scene:
        if (scene["engine"] != "mupi-run-v1" or app_id != "community.mupi-run-native" or
                set(permissions) != {"audio", "controller", "storage"}):
            raise PackageError("unsupported built-in engine, package ID or permissions")
        art = json.loads(Path(__file__).with_name("runner-art-v1.json").read_text())
        sounds = {"assets/audio/" + n + ".wav" for n in ("music", "jump", "slide", "collect")}
        optional = scene.get("optionalSounds", [])
        if (not isinstance(optional, list) or any(n not in ("run","kilometer") for n in optional)
                or len(optional) != len(set(optional))):
            raise PackageError("invalid optional runner samples")
        sounds.update("assets/audio/" + n + ".wav" for n in optional)
        if missing := (set(art) | sounds) - files:
            raise PackageError(f"missing runner asset: {min(missing)}")
    elif app_id == "community.mupi-run-native":
        raise PackageError("runner preview ID requires its built-in engine")
    elif "optionalSounds" in scene or not scene["elements"]:
        raise PackageError("empty Qt scene")
    def bounded(value, lo, hi):
        return type(value) in (int, float) and math.isfinite(value) and lo <= value <= hi
    for element in scene["elements"]:
        if not isinstance(element, dict) or set(element) - {
                "type", "x", "y", "width", "height", "text", "asset", "color", "fontSize", "action", "animateY"}:
            raise PackageError("invalid qtquick scene element")
        x, y, w, h = [element.get(k) for k in ("x", "y", "width", "height")]
        if not (bounded(x, 0, 799) and bounded(y, 0, 479) and bounded(w, 1, 800)
                and bounded(h, 1, 480) and x + w <= 800 and y + h <= 480):
            raise PackageError("qtquick element outside logical display")
        typ, text, asset, action = [element.get(k, "") for k in ("type", "text", "asset", "action")]
        if "engine" in scene and typ != "text" and (typ, action) != ("button", "exit"):
            raise PackageError("runner fallback allows only text and exit")
        if (not isinstance(text, str) or len(text.encode("utf-8")) > 240 or "\0" in text
                or not isinstance(asset, str) or not isinstance(action, str)
                or type(element.get("fontSize", 0)) is not int
                or not 0 <= element.get("fontSize", 0) <= 64
                or ("color" in element and not color(element["color"]))):
            raise PackageError("qtquick element has invalid text or styling")
        if typ in ("text", "counter"):
            if not text or asset or action:
                raise PackageError("qtquick text/counter fields invalid")
        elif typ == "rectangle":
            if not element.get("color") or text or asset or action:
                raise PackageError("qtquick rectangle fields invalid")
        elif typ == "image":
            if (not asset.endswith((".png", ".jpg", ".jpeg", ".webp"))
                    or asset not in files or text or action):
                raise PackageError("qtquick image must be a package asset")
        elif typ == "button":
            if not text:
                raise PackageError("qtquick button must have text")
            if action in ("increment", "reset", "exit"):
                if asset:
                    raise PackageError("qtquick built-in button must not have an asset")
            elif action in ("saveScore", "loadScore"):
                if asset or "storage" not in permissions:
                    raise PackageError("qtquick score persistence needs storage permission")
            elif action in ("playSample", "playMusic"):
                if ("audio" not in permissions or asset not in files
                        or not asset.lower().endswith((".wav", ".ogg", ".mp3"))):
                    raise PackageError("qtquick audio playback needs permission and a packaged audio file")
            elif action in ("stopMusic", "musicLouder", "musicQuieter", "soundLouder", "soundQuieter"):
                if asset or "audio" not in permissions:
                    raise PackageError("qtquick audio control needs audio permission")
            else:
                raise PackageError("qtquick scene action is not approved")
        else:
            raise PackageError("unknown qtquick scene element")
        if "animateY" in element:
            animation = element["animateY"]
            if (typ not in ("image", "rectangle") or not isinstance(animation, dict)
                    or set(animation) != {"from", "to", "durationMs"}
                    or not bounded(animation["from"], 0, 480 - h)
                    or not bounded(animation["to"], 0, 480 - h)
                    or type(animation["durationMs"]) is not int
                    or not 150 <= animation["durationMs"] <= 20000):
                raise PackageError("qtquick scene animation invalid")
    return scene


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
            if PurePosixPath(name).suffix.lower() not in HOST_ALLOWED_EXTENSIONS:
                raise PackageError(f"unsupported file type for MuPiBox-NG: {name}")
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
        validated = validate_manifest(manifest, names)
        if validated["runtime"] == "qtquick-scene":
            scene = validate_qt_scene(archive.read(validated["entry"]), names, validated["permissions"], validated["id"])
            if scene.get("engine") == "mupi-run-v1":
                art = json.loads(Path(__file__).with_name("runner-art-v1.json").read_text())
                for name, size in art.items():
                    with archive.open(name) as image:
                        header = image.read(24)
                    if (header[:16] != bytes.fromhex("89504e470d0a1a0a0000000d49484452") or
                            [int.from_bytes(header[i:i+4], "big") for i in (16, 20)] != size):
                        raise PackageError(f"invalid runner art dimensions: {name}")
        return validated


def pack(source: Path, destination: Path, excluded: tuple[str, ...] | list[str] = ()) -> dict:
    source = source.resolve()
    destination = destination.resolve()
    if not source.is_dir():
        raise PackageError(f"source is not a directory: {source}")
    if source in destination.parents:
        raise PackageError("destination must not be inside source directory")
    excluded_paths = {checked_path(name) for name in excluded}
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
            if name in excluded_paths:
                continue
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
    validated = validate_manifest(manifest, {name for name, _ in paths})
    if validated["runtime"] == "qtquick-scene":
        validate_qt_scene(source.joinpath(validated["entry"]).read_bytes(), {name for name, _ in paths}, validated["permissions"], validated["id"])
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
    sub_pack.add_argument("--exclude", action="append", default=[], metavar="PATH",
                          help="omit an exact repository-only file, e.g. README.md")
    args = parser.parse_args()
    try:
        manifest = validate_package(args.archive) if args.command == "validate" else pack(args.directory, args.archive, args.exclude)
    except (PackageError, OSError, zipfile.BadZipFile) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"OK: {manifest['id']} v{manifest['version']} (API {manifest['apiVersion']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())