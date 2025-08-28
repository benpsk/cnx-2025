export type RawImage = {
  src: string;        // full-size URL (Vite-resolved)
  thumbSrc: string;   // thumbnail URL if available; falls back to full
  path: string;       // Repo path like /images/foo/bar.jpg
  file: string;       // file name
  folder: string;     // immediate parent folder
};

export type PhotoItem = RawImage & {
  width: number;
  height: number;
};

export type Album = {
  key: string;            // folder key
  title: string;          // display title
  path: string;           // e.g., images/chiang-mai-dam
  items: PhotoItem[];
};

// Find images under /images recursively via Vite glob import
// - Full-size originals
// - Optional thumbnails under /images/_thumbs with mirrored structure
const fullModules = import.meta.glob('/images/**/*.{jpg,jpeg,JPG,JPEG}', { eager: true, import: 'default' });
const thumbModules = import.meta.glob('/images/_thumbs/**/*.{webp,WEBP,jpg,jpeg,JPG,JPEG}', { eager: true, import: 'default' });

export function getRawImages(): RawImage[] {
  const raws: RawImage[] = [];
  Object.entries(fullModules).forEach(([absPath, url]) => {
    // Skip any files inside the thumbnails directory
    if (absPath.includes('/_thumbs/')) return;
    // absPath like '/images/trip/day-01/20240915-reykjavik-harbor.jpg'
    const segments = absPath.split('/').filter(Boolean);
    const file = segments[segments.length - 1];
    const folder = segments[segments.length - 2] ?? 'images';
    const repoPath = absPath.slice(1); // drop leading '/'
    const rel = repoPath.replace(/^images\//, '');

    // Try to find a matching thumbnail: images/_thumbs/<rel>.webp or same-ext
    const thumbCandidates = [
      `/images/_thumbs/${rel.replace(/\.[^.]+$/, '.webp')}`,
      `/images/_thumbs/${rel}`,
    ];
    let thumbUrl: string | undefined;
    for (const c of thumbCandidates) {
      const u = thumbModules[c] as unknown as string | undefined;
      if (u) { thumbUrl = u; break; }
    }
    raws.push({ src: url as string, thumbSrc: (thumbUrl ?? (url as string)), path: repoPath, file, folder });
  });
  return raws.sort((a, b) => a.path.localeCompare(b.path));
}

// Fast path: avoid preloading all images just to get dimensions.
// Provide a sane placeholder aspect ratio so the gallery can render immediately.
// This eliminates the multi-minute stall from fetching every image upfront on GH Pages.
export async function measureImages(raws: RawImage[]): Promise<PhotoItem[]> {
  // Default to a landscape-friendly aspect; the gallery uses object-fit: cover.
  const DEFAULT = { width: 4, height: 3 };
  return raws.map(r => ({ ...r, ...DEFAULT }));
}

export function groupIntoAlbums(items: PhotoItem[]): Album[] {
  const map = new Map<string, Album>();
  for (const it of items) {
    const key = it.path.split('/').slice(0, -1).join('/');
    if (!map.has(key)) {
      map.set(key, { key, title: albumTitleFromPath(key), path: key, items: [] });
    }
    map.get(key)!.items.push(it);
  }
  // sort items by file name (often encodes date)
  for (const a of map.values()) a.items.sort((x, y) => x.file.localeCompare(y.file));
  return Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));
}

function albumTitleFromPath(p: string): string {
  // p like 'images/chiang-mai-dam' -> 'chiang mai dam'
  const base = p.split('/').pop() || 'images';
  return base.replace(/[-_]+/g, ' ');
}

// Legacy helper kept for reference. Not used in the fast path above because it
// forces the browser to download every image to read dimensions, which tanks
// performance on large galleries, especially on GitHub Pages.
function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}
