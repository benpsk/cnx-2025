#!/usr/bin/env python3
import subprocess
import sys
import os
import time
from pathlib import Path
from typing import Dict, List, Tuple, Set


def have_pillow() -> bool:
    try:
        import PIL  # type: ignore
        return True
    except Exception:
        return False


def iter_image_paths(root: Path):
    exts = {".jpg", ".jpeg"}
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            yield p


def ahash_pillow(path: Path) -> int:
    from PIL import Image  # type: ignore
    with Image.open(path) as im:
        im = im.convert("L")  # grayscale
        im = im.resize((8, 8), Image.BILINEAR)
        pixels = list(im.getdata())  # 64 values 0..255
    avg = sum(pixels) / 64.0
    bits = 0
    for v in pixels:
        bits = (bits << 1) | (1 if v > avg else 0)
    return bits


def ahash_imagemagick(path: Path) -> int:
    # Use ImageMagick to emit 8x8 grayscale raw bytes, then compute average hash
    # Try `magick convert` first, then fallback to `convert`
    cmd_variants = [
        ["magick", "convert", str(path), "-colorspace", "RGB", "-resize", "8x8!", "-colorspace", "Gray", "-depth", "8", "gray:-"],
        ["convert", str(path), "-colorspace", "RGB", "-resize", "8x8!", "-colorspace", "Gray", "-depth", "8", "gray:-"],
    ]
    last_err = None
    for cmd in cmd_variants:
        try:
            out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL)
            if len(out) < 64:
                raise RuntimeError("unexpected gray output size")
            pixels = out[:64]
            avg = sum(pixels) / 64.0
            bits = 0
            for v in pixels:
                bits = (bits << 1) | (1 if v > avg else 0)
            return bits
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"ImageMagick convert not available or failed: {last_err}")


def ahash(path: Path) -> int:
    if have_pillow():
        return ahash_pillow(path)
    return ahash_imagemagick(path)


def hamming(a: int, b: int) -> int:
    return (a ^ b).bit_count()


class DSU:
    def __init__(self, n: int):
        self.p = list(range(n))
        self.r = [0] * n

    def find(self, x: int) -> int:
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a: int, b: int):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        if self.r[ra] < self.r[rb]:
            ra, rb = rb, ra
        self.p[rb] = ra
        if self.r[ra] == self.r[rb]:
            self.r[ra] += 1


def mode_to_threshold(mode: str) -> int:
    mode = (mode or "").lower()
    if mode in ("conservative", "c"):
        return 5
    if mode in ("aggressive", "a"):
        return 16
    # default medium
    return 10


def main(argv: List[str]) -> int:
    import argparse

    ap = argparse.ArgumentParser(description="Find near-duplicate JPEGs using average perceptual hash (8x8)")
    ap.add_argument("--root", default="images", help="Root folder to scan (default: images)")
    ap.add_argument("--mode", choices=["conservative", "medium", "aggressive"], default="medium", help="Similarity mode")
    ap.add_argument("--threshold", type=int, default=None, help="Override Hamming threshold (0-64)")
    ap.add_argument("--delete", action="store_true", help="Delete proposed near-duplicates (use with --yes)")
    ap.add_argument("--yes", action="store_true", help="Confirm deletion when --delete is set")
    args = ap.parse_args(argv)

    root = Path(args.root)
    if not root.exists():
        print(f"Root not found: {root}", file=sys.stderr)
        return 2

    thr = args.threshold if args.threshold is not None else mode_to_threshold(args.mode)
    if thr < 0 or thr > 64:
        print("Threshold must be between 0 and 64", file=sys.stderr)
        return 2

    files = sorted(iter_image_paths(root), key=lambda p: str(p))
    print(f"Hashing {len(files)} image(s) with 8x8 aHash…", flush=True)

    hashes: List[int] = []
    failures: List[Tuple[Path, str]] = []
    for i, p in enumerate(files, 1):
        try:
            h = ahash(p)
            hashes.append(h)
        except Exception as e:
            hashes.append(-1)
            failures.append((p, str(e)))
        if i % 50 == 0 or i == len(files):
            print(f"  Hashed {i}/{len(files)}", flush=True)

    # Build similarity graph using threshold
    print(f"Comparing hashes (threshold={thr})…", flush=True)
    n = len(files)
    dsu = DSU(n)
    pairs = 0
    for i in range(n):
        hi = hashes[i]
        if hi < 0:
            continue
        for j in range(i + 1, n):
            hj = hashes[j]
            if hj < 0:
                continue
            if hamming(hi, hj) <= thr:
                dsu.union(i, j)
                pairs += 1

    # Collect components
    comps: Dict[int, List[int]] = {}
    for idx in range(n):
        if hashes[idx] < 0:
            continue
        root_idx = dsu.find(idx)
        comps.setdefault(root_idx, []).append(idx)

    groups = [sorted(idxs) for idxs in comps.values() if len(idxs) > 1]
    groups.sort(key=lambda g: (len(g), [str(files[i]) for i in g]))

    ts = time.strftime("%Y%m%d-%H%M%S")
    review_manifest = Path(f"near-duplicate-review-{ts}.txt")
    removed_manifest = Path(f"near-duplicate-removals-{ts}.txt")

    kept_total = 0
    delete_total = 0
    with review_manifest.open("w", encoding="utf-8") as mf:
        mf.write("Near-duplicate review manifest (8x8 aHash)\n")
        mf.write(time.strftime("Generated: %Y-%m-%d %H:%M:%S") + "\n")
        mf.write(f"Mode: {args.mode}  Threshold: {thr}\n")
        if failures:
            mf.write(f"Hash failures: {len(failures)}\n")
            for p, err in failures[:10]:
                mf.write(f"  FAIL {p}: {err}\n")
            if len(failures) > 10:
                mf.write(f"  … {len(failures) - 10} more failures omitted\n")
        mf.write("\n")

        for gi, group in enumerate(groups, 1):
            paths = [files[i] for i in group]
            # Propose keeping lexicographically first path
            paths_sorted = sorted(paths, key=lambda p: str(p))
            keep = paths_sorted[0]
            dupes = paths_sorted[1:]
            kept_total += 1
            delete_total += len(dupes)
            mf.write(f"Group {gi} (size={len(paths)}):\n")
            mf.write(f"  KEEP: {keep}\n")
            for d in dupes:
                mf.write(f"  DEL?: {d}\n")
            mf.write("\n")

    print(f"Groups found: {len(groups)}")
    print(f"Proposed deletions: {delete_total} (keeping {kept_total})")
    print(f"Review manifest: {review_manifest}")

    if args.delete:
        if not args.yes:
            print("--delete specified without --yes; skipping deletion.")
            return 0
        removed = 0
        with removed_manifest.open("w", encoding="utf-8") as rm:
            rm.write("Near-duplicate removals (executed)\n")
            rm.write(time.strftime("Generated: %Y-%m-%d %H:%M:%S") + "\n")
            rm.write(f"Mode: {args.mode}  Threshold: {thr}\n\n")
            for gi, group in enumerate(groups, 1):
                paths = [files[i] for i in group]
                paths_sorted = sorted(paths, key=lambda p: str(p))
                keep = paths_sorted[0]
                dupes = paths_sorted[1:]
                rm.write(f"Group {gi} (size={len(paths)}):\n")
                rm.write(f"  KEEP: {keep}\n")
                for d in dupes:
                    try:
                        os.remove(d)
                        removed += 1
                        rm.write(f"  DEL : {d}\n")
                    except Exception as e:
                        rm.write(f"  FAIL: {d} ({e})\n")
                rm.write("\n")
        print(f"Deleted near-duplicates: {removed}")
        print(f"Removal manifest: {removed_manifest}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

