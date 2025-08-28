#!/usr/bin/env python3
import hashlib
import os
import sys
import time
from pathlib import Path


def iter_image_paths(root: Path):
    exts = {".jpg", ".jpeg"}
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() in exts:
            yield p


def sha256_file(path: Path, bufsize: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(bufsize)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def main():
    images_root = Path("images")
    if not images_root.exists():
        print("images/ directory not found", file=sys.stderr)
        sys.exit(1)

    # Hash files and group by digest
    digest_map: dict[str, list[Path]] = {}
    files = sorted(iter_image_paths(images_root))
    total = len(files)
    print(f"Scanning {total} image(s) for exact duplicates…", flush=True)

    for i, p in enumerate(files, 1):
        try:
            digest = sha256_file(p)
        except Exception as e:
            print(f"WARN: failed to hash {p}: {e}", file=sys.stderr)
            continue
        digest_map.setdefault(digest, []).append(p)
        if i % 50 == 0 or i == total:
            print(f"  Hashed {i}/{total}", flush=True)

    # Prepare manifest
    ts = time.strftime("%Y%m%d-%H%M%S")
    manifest = Path(f"duplicate-removals-{ts}.txt")
    removed_count = 0
    groups_with_dupes = 0

    with manifest.open("w", encoding="utf-8") as mf:
        mf.write("Duplicate removal manifest (exact SHA-256 matches)\n")
        mf.write(time.strftime("Generated: %Y-%m-%d %H:%M:%S") + "\n\n")
        for digest, paths in sorted(digest_map.items()):
            if len(paths) <= 1:
                continue
            groups_with_dupes += 1
            # Keep lexicographically first path; delete the rest
            paths_sorted = sorted(paths, key=lambda p: str(p))
            keep = paths_sorted[0]
            dupes = paths_sorted[1:]
            mf.write(f"Digest: {digest}\n")
            mf.write(f"  KEEP: {keep}\n")
            for dup in dupes:
                try:
                    os.remove(dup)
                    removed_count += 1
                    mf.write(f"  DEL : {dup}\n")
                except Exception as e:
                    mf.write(f"  FAIL: {dup} ({e})\n")
            mf.write("\n")

    print(f"Groups with duplicates: {groups_with_dupes}")
    print(f"Deleted duplicate files: {removed_count}")
    print(f"Manifest written to: {manifest}")


if __name__ == "__main__":
    main()

