import concurrent.futures
import hashlib
import json
import mimetypes
import os
import re
import shutil
import subprocess
import tarfile
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "dle.config.json"
MEDIA_ROOT = ROOT / ".dle-media"
FILES_DIR = MEDIA_ROOT / "files"
CACHE_DIR = MEDIA_ROOT / "cache"
CATALOG_PATH = ROOT / "src" / "data" / "catalog.json"

OFFICE_EXTS = {".pptx", ".docx", ".ppt", ".doc", ".xlsx", ".xls"}
TEXT_EXTS = {".txt", ".md", ".rules", ".lua", ".conf", ".json", ".csv", ".log", ".sh", ".py"}
PCAP_MAGICS = (b"\xd4\xc3\xb2\xa1", b"\xa1\xb2\xc3\xd4", b"\x4d\x3c\xb2\xa1", b"\xa1\xb2\x3c\x4d", b"\x0a\x0d\x0d\x0a")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(1048576)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return s[:64] or "item"


def natural_key(text: str):
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", text)]


def clean_title(filename: str) -> str:
    stem = Path(filename).stem
    if filename.lower().endswith(".tar.gz"):
        stem = filename[:-7]
    elif filename.lower().endswith(".pcap.zip"):
        stem = filename[:-9]
    stem = re.sub(r"\s*\(\d+\)\s*", " ", stem)
    stem = re.sub(r"\s+", " ", stem).strip()
    return stem or filename


def detect_format(path: Path) -> tuple[str, str]:
    lower = path.name.lower()
    if lower.endswith(".tar.gz"):
        return "TAR.GZ", "binary"
    ext = path.suffix.lower()
    if ext == ".pdf":
        return "PDF", "pdf"
    if ext == ".pptx":
        return "PPTX", "pdf"
    if ext == ".docx":
        return "DOCX", "pdf"
    if ext == ".mp4":
        return "MP4", "video"
    if ext in TEXT_EXTS:
        return ext.lstrip(".").upper(), "text"
    if ext == ".zip":
        return "ZIP", "binary"
    if ext == ".pcap":
        return "PCAP", "binary"
    if ext == ".dd":
        return "DD", "binary"
    if ext == ".e01":
        return "E01", "binary"
    if not ext:
        head = path.read_bytes()[:4096]
        if any(head.startswith(m) for m in PCAP_MAGICS):
            return "PCAP", "binary"
        try:
            head.decode("utf-8")
            if b"\x00" not in head:
                return "TXT", "text"
        except UnicodeDecodeError:
            pass
    return (ext.lstrip(".").upper() or "FILE"), "binary"


def mime_for_key(key: str, viewer_kind: str) -> str:
    lower = key.lower()
    if lower.endswith(".pdf"):
        return "application/pdf"
    if lower.endswith(".mp4"):
        return "video/mp4"
    if viewer_kind == "text" or lower.endswith((".txt", ".md", ".rules", ".lua")):
        return "text/plain; charset=utf-8"
    if lower.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if lower.endswith(".pptx"):
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    if lower.endswith(".zip"):
        return "application/zip"
    if lower.endswith(".gz"):
        return "application/gzip"
    if lower.endswith(".pcap"):
        return "application/vnd.tcpdump.pcap"
    guessed, _ = mimetypes.guess_type(key)
    return guessed or "application/octet-stream"


def stage_blob(src_path: Path, digest: str, suffix: str) -> str:
    ext = suffix if suffix.startswith(".") else (f".{suffix}" if suffix else "")
    key = f"objects/{digest[:20]}{ext}"
    dst = FILES_DIR / key
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists() or dst.stat().st_size != src_path.stat().st_size:
        shutil.copy2(src_path, dst)
    return key


def stage_bytes(data: bytes, digest: str, suffix: str) -> str:
    ext = suffix if suffix.startswith(".") else (f".{suffix}" if suffix else "")
    key = f"objects/{digest[:20]}{ext}"
    dst = FILES_DIR / key
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists() or dst.stat().st_size != len(data):
        dst.write_bytes(data)
    return key


def convert_office_to_pdf(src_path: Path, digest: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cached = CACHE_DIR / f"{digest[:20]}.pdf"
    if cached.exists() and cached.stat().st_size > 0:
        return cached
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        profile_dir = tmp_path / "profile"
        out_dir = tmp_path / "out"
        profile_dir.mkdir()
        out_dir.mkdir()
        cmd = [
            "soffice",
            f"-env:UserInstallation=file://{profile_dir}",
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--convert-to",
            "pdf",
            "--outdir",
            str(out_dir),
            str(src_path),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        pdfs = list(out_dir.glob("*.pdf"))
        if not pdfs:
            raise RuntimeError(f"LibreOffice produced no PDF for {src_path}")
        shutil.move(str(pdfs[0]), str(cached))
    return cached


def remux_mp4_faststart(src_path: Path, digest: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cached = CACHE_DIR / f"{digest[:20]}.mp4"
    if cached.exists() and cached.stat().st_size > 0:
        return cached
    tmp_out = CACHE_DIR / f"{digest[:20]}.tmp.mp4"
    cmd = [
        "ffmpeg",
        "-y",
        "-v",
        "error",
        "-i",
        str(src_path),
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        str(tmp_out),
    ]
    subprocess.run(cmd, check=True)
    tmp_out.replace(cached)
    return cached


def list_archive_entries(path: Path) -> list[dict]:
    entries = []
    lower = path.name.lower()
    if lower.endswith(".zip"):
        with zipfile.ZipFile(path, "r") as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                if info.filename.startswith("__MACOSX/") or info.filename.endswith(".DS_Store"):
                    continue
                entries.append({"name": info.filename, "size": info.file_size})
    elif lower.endswith(".tar.gz"):
        with tarfile.open(path, "r:gz") as tf:
            for member in tf.getmembers():
                if not member.isfile():
                    continue
                entries.append({"name": member.name, "size": member.size})
    return entries


def parse_links_md(path: Path) -> list[dict]:
    if not path.exists():
        return []
    groups = []
    current_group = "Links"
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        if line.startswith("## "):
            current_group = line[3:].strip()
        elif line.startswith("- "):
            body = line[2:].strip()
            m = re.search(r"(https?://\S+)$", body)
            if not m:
                continue
            url = m.group(1)
            label = body[: m.start()].rstrip(": ").strip()
            groups.append({"group": current_group, "title": label or url, "url": url})
    return groups


def classify_category(rel_path: str, section_dir: str, viewer_kind: str) -> str:
    low = rel_path.lower()
    if viewer_kind == "video":
        return "video"
    if section_dir in ("assessments", "coursework", "docs") or "coursework" in low or "module record" in low:
        return "assessment"
    if "lab" in low or section_dir == "practicals" or "practical" in low or "autopsy" in low or "carving" in low:
        return "lab"
    if section_dir == "slides" or re.search(r"(^|/)l\d{2}\b", low) or re.match(r"^slides/", low):
        return "lecture"
    return "resource"


def main():
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    office_jobs = {}
    video_jobs = {}
    scanned_modules = []

    for mod in config["modules"]:
        src_root = Path(mod["sourceDir"])
        exclude_dirs = set(mod.get("excludeDirs", []))
        exclude_files = set(mod.get("excludeFiles", []))
        quarantine_files = set(mod.get("quarantineFiles", []))
        extract_zips = {z["path"]: z for z in mod.get("extractZips", [])}

        all_files = []
        for dirpath, dirnames, filenames in os.walk(src_root):
            rel_dir = Path(dirpath).relative_to(src_root)
            dirnames[:] = sorted(
                [d for d in dirnames if not (len(rel_dir.parts) == 0 and d in exclude_dirs)],
                key=natural_key,
            )
            for fn in sorted(filenames, key=natural_key):
                full = Path(dirpath) / fn
                rel = full.relative_to(src_root).as_posix()
                if rel in exclude_files or fn == ".DS_Store":
                    continue
                digest = sha256_file(full)
                fmt, viewer_kind = detect_format(full)
                if full.suffix.lower() in OFFICE_EXTS:
                    office_jobs[digest] = full
                elif viewer_kind == "video":
                    video_jobs[digest] = full
                all_files.append((full, rel, digest, fmt, viewer_kind))

        scanned_modules.append((mod, src_root, quarantine_files, extract_zips, all_files))

    print(f"Converting {len(office_jobs)} Office documents with LibreOffice...", flush=True)
    office_outputs = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(convert_office_to_pdf, p, d): (d, p) for d, p in office_jobs.items()}
        for fut in concurrent.futures.as_completed(futs):
            d, p = futs[fut]
            out_pdf = fut.result()
            office_outputs[d] = out_pdf
            print(f"  PDF ready: {p.name} -> {out_pdf.stat().st_size} bytes", flush=True)

    print(f"Faststart remuxing {len(video_jobs)} MP4 videos with ffmpeg...", flush=True)
    video_outputs = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        futs = {ex.submit(remux_mp4_faststart, p, d): (d, p) for d, p in video_jobs.items()}
        for fut in concurrent.futures.as_completed(futs):
            d, p = futs[fut]
            out_mp4 = fut.result()
            video_outputs[d] = out_mp4
            print(f"  MP4 ready: {p.name} -> {out_mp4.stat().st_size} bytes", flush=True)

    used_ids = set()

    def unique_id(base: str) -> str:
        candidate = base
        idx = 2
        while candidate in used_ids:
            candidate = f"{base}-{idx}"
            idx += 1
        used_ids.add(candidate)
        return candidate

    modules_out = []
    object_meta = {}

    for mod, src_root, quarantine_files, extract_zips, all_files in scanned_modules:
        code = mod["code"]
        section_order = mod["sectionOrder"]
        section_map = {s["dir"]: {"id": slugify(f"{code}-{s['dir']}"), "dir": s["dir"], "title": s["title"], "items": []} for s in section_order}
        extra_items = []

        for full, rel, digest, fmt, viewer_kind in all_files:
            top_dir = rel.split("/")[0] if "/" in rel else "general"
            if top_dir not in section_map:
                section_map[top_dir] = {
                    "id": slugify(f"{code}-{top_dir}"),
                    "dir": top_dir,
                    "title": top_dir.replace("-", " ").title(),
                    "items": [],
                }
            sec = section_map[top_dir]
            sub_parts = rel.split("/")[1:-1]
            sub_label = " / ".join(p.replace("-", " ").title() for p in sub_parts)

            raw_ext = ".tar.gz" if full.name.lower().endswith(".tar.gz") else full.suffix.lower()
            if viewer_kind == "video":
                remuxed = video_outputs[digest]
                r_digest = sha256_file(remuxed)
                media_key = stage_blob(remuxed, r_digest, ".mp4")
                original_key = media_key
                object_meta[media_key] = mime_for_key(media_key, "video")
            elif full.suffix.lower() in OFFICE_EXTS:
                orig_key = stage_blob(full, digest, raw_ext)
                object_meta[orig_key] = mime_for_key(orig_key, "binary")
                pdf_path = office_outputs[digest]
                p_digest = sha256_file(pdf_path)
                media_key = stage_blob(pdf_path, p_digest, ".pdf")
                object_meta[media_key] = "application/pdf"
                original_key = orig_key
            else:
                staged_ext = ".txt" if viewer_kind == "text" and not raw_ext else raw_ext
                media_key = stage_blob(full, digest, staged_ext)
                object_meta[media_key] = mime_for_key(media_key, viewer_kind)
                original_key = media_key

            item_id = unique_id(slugify(f"{code}-{rel}"))
            quarantined = rel in quarantine_files
            archive_entries = []

            if fmt in ("ZIP", "TAR.GZ"):
                archive_entries = list_archive_entries(full)

            if rel in extract_zips and fmt == "ZIP":
                zcfg = extract_zips[rel]
                with zipfile.ZipFile(full, "r") as zf:
                    for entry in archive_entries:
                        ename = entry["name"]
                        ep = Path(ename)
                        eext = ep.suffix.lower()
                        if eext == ".pdf" or eext in TEXT_EXTS:
                            data = zf.read(ename)
                            edigest = sha256_bytes(data)
                            ekind = "pdf" if eext == ".pdf" else "text"
                            efmt = "PDF" if eext == ".pdf" else eext.lstrip(".").upper()
                            ekey = stage_bytes(data, edigest, eext)
                            object_meta[ekey] = mime_for_key(ekey, ekind)
                            eid = unique_id(slugify(f"{code}-{rel}-{ep.name}"))
                            entry["viewId"] = eid
                            extracted_item = {
                                "id": eid,
                                "moduleCode": code,
                                "sectionId": sec["id"],
                                "sectionTitle": sec["title"],
                                "subgroup": sub_label or clean_title(full.name),
                                "title": clean_title(ep.name),
                                "filename": ep.name,
                                "relativePath": f"{rel}/{ename}",
                                "format": efmt,
                                "viewerKind": ekind,
                                "category": classify_category(rel, top_dir, ekind),
                                "size": len(data),
                                "sha256": edigest,
                                "mediaKey": ekey,
                                "originalKey": ekey,
                                "converted": False,
                                "quarantined": False,
                                "archiveEntries": [],
                                "parentArchiveId": item_id,
                                "hiddenInListing": not (zcfg.get("promotePdfs") and eext == ".pdf"),
                            }
                            if zcfg.get("promotePdfs") and eext == ".pdf":
                                sec["items"].append(extracted_item)
                            else:
                                extra_items.append(extracted_item)

            item = {
                "id": item_id,
                "moduleCode": code,
                "sectionId": sec["id"],
                "sectionTitle": sec["title"],
                "subgroup": sub_label,
                "title": clean_title(full.name),
                "filename": full.name,
                "relativePath": rel,
                "format": fmt,
                "viewerKind": viewer_kind,
                "category": classify_category(rel, top_dir, viewer_kind),
                "size": full.stat().st_size,
                "sha256": digest,
                "mediaKey": media_key,
                "originalKey": original_key,
                "converted": full.suffix.lower() in OFFICE_EXTS,
                "quarantined": quarantined,
                "archiveEntries": archive_entries,
                "parentArchiveId": None,
                "hiddenInListing": False,
            }
            sec["items"].append(item)

        ordered_sections = []
        seen_dirs = set()
        for s in section_order:
            sec = section_map[s["dir"]]
            if sec["items"]:
                sec["items"].sort(key=lambda it: (natural_key(it["subgroup"]), natural_key(it["filename"])))
                ordered_sections.append(sec)
            seen_dirs.add(s["dir"])
        for d, sec in section_map.items():
            if d not in seen_dirs and sec["items"]:
                sec["items"].sort(key=lambda it: (natural_key(it["subgroup"]), natural_key(it["filename"])))
                ordered_sections.append(sec)

        external_links = parse_links_md(src_root / "links.md")
        visible_items = [it for sec in ordered_sections for it in sec["items"]]

        modules_out.append(
            {
                "code": code,
                "title": mod["title"],
                "semester": mod["semester"],
                "dleUrl": mod["dleUrl"],
                "sections": ordered_sections,
                "hiddenItems": extra_items,
                "externalLinks": external_links,
                "stats": {
                    "totalItems": len(visible_items),
                    "lectures": sum(1 for it in visible_items if it["category"] == "lecture"),
                    "labs": sum(1 for it in visible_items if it["category"] == "lab"),
                    "videos": sum(1 for it in visible_items if it["viewerKind"] == "video"),
                    "documents": sum(1 for it in visible_items if it["viewerKind"] == "pdf"),
                    "totalBytes": sum(it["size"] for it in visible_items),
                },
            }
        )

    active_keys = set(object_meta.keys())
    for existing in (FILES_DIR / "objects").glob("*"):
        rel_k = f"objects/{existing.name}"
        if rel_k not in active_keys:
            existing.unlink()

    catalog = {
        "r2Bucket": config["r2Bucket"],
        "objects": object_meta,
        "modules": modules_out,
    }
    CATALOG_PATH.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")

    staged_bytes = sum((FILES_DIR / k).stat().st_size for k in object_meta)
    total_visible = sum(m["stats"]["totalItems"] for m in modules_out)
    total_hidden = sum(len(m["hiddenItems"]) for m in modules_out)
    print(
        f"INGEST COMPLETE: {total_visible} visible items, {total_hidden} archive-extracted items, "
        f"{len(object_meta)} deduplicated objects ({staged_bytes / 1048576:.1f} MB)",
        flush=True,
    )


if __name__ == "__main__":
    main()
